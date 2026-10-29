import {
  assertValidTimeRange,
  horizonRange,
  localDateString,
  nextMondayDate,
  propagateTemplateChange,
  templateConflicts,
  type ClassInstance,
  type ClassTemplate,
  type PatchTemplate,
  type PropagationSummary,
  type TemplateWrite,
} from "@78feet/domain";
import { prisma } from "../db";
import type { Db } from "./db";
import { BoxError } from "./errors";
import { ensureInstances } from "./materialize";
import { clockFromDb, clockToDb, isoDateFromDb, isoDateToDb, normalizeClock } from "./time";

export type TemplateView = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  title: string;
  kind: "directed" | "open";
  coachId: string | null;
  defaultCapacity: number;
  active: boolean;
};

const emptySummary: PropagationSummary = {
  cancelledClassCount: 0,
  cancelledBookingCount: 0,
  movedBookingCount: 0,
};

function toView(row: {
  id: string;
  weekday: number;
  startTime: Date;
  endTime: Date;
  title: string;
  kind: "directed" | "open";
  coachId: string | null;
  defaultCapacity: number;
  active: boolean;
}): TemplateView {
  return {
    id: row.id,
    weekday: row.weekday,
    startTime: clockFromDb(row.startTime),
    endTime: clockFromDb(row.endTime),
    title: row.title,
    kind: row.kind,
    coachId: row.coachId,
    defaultCapacity: row.defaultCapacity,
    active: row.active,
  };
}

function toDomainTemplate(view: TemplateView): ClassTemplate {
  return { ...view };
}

function toDomainInstance(row: {
  id: string;
  templateId: string | null;
  date: Date;
  startAt: Date;
  endAt: Date;
  title: string;
  kind: "directed" | "open";
  coachId: string | null;
  capacity: number;
  status: "scheduled" | "cancelled";
  editedAt: Date | null;
}): ClassInstance {
  return {
    id: row.id,
    templateId: row.templateId,
    date: isoDateFromDb(row.date),
    startAt: row.startAt,
    endAt: row.endAt,
    title: row.title,
    kind: row.kind,
    coachId: row.coachId,
    capacity: row.capacity,
    status: row.status,
    editedAt: row.editedAt,
  };
}

async function assertCoach(coachId: string | null | undefined): Promise<void> {
  if (!coachId) return;
  const coach = await prisma.user.findUnique({ where: { id: coachId } });
  if (!coach || coach.status !== "active" || (coach.role !== "coach" && coach.role !== "admin")) {
    throw new BoxError(400, "FORBIDDEN", "El coach no existe");
  }
}

async function assertNoOverlap(
  candidate: Pick<ClassTemplate, "weekday" | "startTime" | "endTime"> & { id?: string },
): Promise<void> {
  const others = await prisma.classTemplate.findMany({
    where: { active: true, weekday: candidate.weekday },
  });
  const domainOthers = others.map((row) => toDomainTemplate(toView(row)));
  if (templateConflicts(candidate, domainOthers)) {
    throw new BoxError(409, "OVERLAP", "Esa hora se solapa con otra clase del mismo día");
  }
}

export async function listTemplates(): Promise<TemplateView[]> {
  const rows = await prisma.classTemplate.findMany({
    where: { active: true },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  return rows.map(toView);
}

export async function createTemplate(input: TemplateWrite, now = new Date()) {
  const startTime = normalizeClock(input.startTime);
  const endTime = normalizeClock(input.endTime);
  assertValidTimeRange(startTime, endTime);
  await assertCoach(input.coachId);
  const candidate = {
    weekday: input.weekday,
    startTime,
    endTime,
    title: input.title,
    kind: input.kind,
    coachId: input.coachId ?? null,
    defaultCapacity: input.defaultCapacity,
  };
  await assertNoOverlap(candidate);
  const today = localDateString(now);
  const range = horizonRange(today);
  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.classTemplate.create({
      data: {
        weekday: candidate.weekday,
        startTime: clockToDb(candidate.startTime),
        endTime: clockToDb(candidate.endTime),
        title: candidate.title,
        kind: candidate.kind,
        coachId: candidate.coachId,
        defaultCapacity: candidate.defaultCapacity,
        active: true,
      },
    });
    const createdCount = await ensureInstances(tx, range.from, range.to, created.id);
    return { view: toView(created), createdCount };
  });
  return { template: template.view, createdInstanceCount: template.createdCount };
}

export async function updateTemplate(id: string, patch: PatchTemplate, actorId: string, now = new Date()) {
  const existing = await prisma.classTemplate.findUnique({ where: { id } });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "La plantilla no existe");
  if (!existing.active) {
    throw new BoxError(403, "FORBIDDEN", "Una plantilla dada de baja no se vuelve a activar");
  }
  const current = toView(existing);
  const next: TemplateView = {
    ...current,
    weekday: patch.weekday ?? current.weekday,
    startTime: normalizeClock(patch.startTime ?? current.startTime),
    endTime: normalizeClock(patch.endTime ?? current.endTime),
    title: patch.title ?? current.title,
    kind: patch.kind ?? current.kind,
    coachId: patch.coachId === undefined ? current.coachId : patch.coachId,
    defaultCapacity: patch.defaultCapacity ?? current.defaultCapacity,
  };
  assertValidTimeRange(next.startTime, next.endTime);
  await assertCoach(next.coachId);
  await assertNoOverlap(next);
  const today = localDateString(now);
  const from = nextMondayDate(today);
  const to = horizonRange(today).to;
  return prisma.$transaction(async (tx) => {
    await tx.classTemplate.update({
      where: { id },
      data: {
        weekday: next.weekday,
        startTime: clockToDb(next.startTime),
        endTime: clockToDb(next.endTime),
        title: next.title,
        kind: next.kind,
        coachId: next.coachId,
        defaultCapacity: next.defaultCapacity,
      },
    });
    const summary = await propagate(tx, id, actorId, today, now, {
      type: "update",
      template: toDomainTemplate(next),
    });
    await ensureInstances(tx, from, to, id);
    return { template: next, summary };
  });
}

export async function deleteTemplate(id: string, actorId: string, now = new Date()) {
  const existing = await prisma.classTemplate.findUnique({ where: { id } });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "La plantilla no existe");
  const view = toView(existing);
  if (!existing.active) {
    return { template: view, summary: emptySummary };
  }
  const today = localDateString(now);
  return prisma.$transaction(async (tx) => {
    await tx.classTemplate.update({ where: { id }, data: { active: false } });
    const summary = await propagate(tx, id, actorId, today, now, { type: "delete" });
    return { template: { ...view, active: false }, summary };
  });
}

async function propagate(
  tx: Db,
  templateId: string,
  actorId: string,
  today: string,
  now: Date,
  change: Parameters<typeof propagateTemplateChange>[0]["change"],
): Promise<PropagationSummary> {
  const from = isoDateToDb(nextMondayDate(today));
  const rows = await tx.classInstance.findMany({
    where: { date: { gte: from } },
    include: { bookings: true },
  });
  const instances = rows.map(toDomainInstance);
  const bookings = rows.flatMap((row) =>
    row.bookings.map((booking) => ({
      id: booking.id,
      instanceId: booking.instanceId,
      userId: booking.userId,
      pool: booking.pool,
      status: booking.status,
      quotaReturned: booking.quotaReturned,
      createdBy: booking.createdBy,
      cancelledAt: booking.cancelledAt,
      cancelledBy: booking.cancelledBy,
    })),
  );
  const result = propagateTemplateChange({
    today,
    templateId,
    change,
    instances,
    bookings,
    now,
  });
  const beforeInstances = new Map(instances.map((instance) => [instance.id, instance]));
  for (const instance of result.instances) {
    const before = beforeInstances.get(instance.id);
    if (!before || sameInstance(before, instance)) continue;
    await tx.classInstance.update({
      where: { id: instance.id },
      data: {
        startAt: instance.startAt,
        endAt: instance.endAt,
        title: instance.title,
        kind: instance.kind,
        coachId: instance.coachId,
        capacity: instance.capacity,
        status: instance.status,
        cancelReason:
          before.status !== "cancelled" && instance.status === "cancelled"
            ? "Cambio de plantilla"
            : undefined,
      },
    });
  }
  const beforeBookings = new Map(bookings.map((booking) => [booking.id, booking]));
  for (const booking of result.bookings) {
    const before = beforeBookings.get(booking.id);
    if (!before || sameBooking(before, booking)) continue;
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        instanceId: booking.instanceId,
        status: booking.status,
        quotaReturned: booking.quotaReturned,
        cancelledAt: booking.cancelledAt,
        cancelledBy:
          booking.status === "cancelled"
            ? booking.cancelledBy && isUuid(booking.cancelledBy)
              ? booking.cancelledBy
              : actorId
            : null,
      },
    });
  }
  return result.summary;
}

function sameInstance(left: ClassInstance, right: ClassInstance): boolean {
  return (
    left.startAt.getTime() === right.startAt.getTime() &&
    left.endAt.getTime() === right.endAt.getTime() &&
    left.title === right.title &&
    left.kind === right.kind &&
    left.coachId === right.coachId &&
    left.capacity === right.capacity &&
    left.status === right.status
  );
}

function sameBooking(
  left: { instanceId: string; status: string; quotaReturned: boolean | null },
  right: { instanceId: string; status: string; quotaReturned: boolean | null },
): boolean {
  return (
    left.instanceId === right.instanceId &&
    left.status === right.status &&
    left.quotaReturned === right.quotaReturned
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
