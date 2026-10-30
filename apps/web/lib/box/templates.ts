import {
  assertValidTimeRange,
  isWithinOpeningIntervals,
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
import { requireClassType } from "./class-types";
import { toDomainBooking, toDomainInstance, toDomainTemplate, typeView } from "./map";
import { ensureInstances } from "./materialize";
import { getBoxHours } from "./hours";
import { clockFromDb, clockToDb, isoDateToDb, normalizeClock } from "./time";

export type TemplateView = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  kind: "directed" | "open";
  classTypeName: string;
  imageUrl: string;
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
  classTypeId: string;
  classType: { id: string; name: string; kind: "directed" | "open"; imageKey: string };
  coachId: string | null;
  defaultCapacity: number;
  active: boolean;
}): TemplateView {
  const type = typeView(row.classType);
  return {
    id: row.id,
    weekday: row.weekday,
    startTime: clockFromDb(row.startTime),
    endTime: clockFromDb(row.endTime),
    classTypeId: row.classTypeId,
    kind: type.kind,
    classTypeName: type.name,
    imageUrl: type.imageUrl,
    coachId: row.coachId,
    defaultCapacity: row.defaultCapacity,
    active: row.active,
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
  candidate: Pick<ClassTemplate, "weekday" | "startTime" | "endTime" | "kind"> & { id?: string },
): Promise<void> {
  const others = await prisma.classTemplate.findMany({
    where: { active: true, weekday: candidate.weekday },
    include: { classType: true },
  });
  const domainOthers = others.map((row) => toDomainTemplate(row));
  if (templateConflicts(candidate, domainOthers)) {
    const lane = candidate.kind === "open" ? "open" : "clase dirigida";
    throw new BoxError(409, "OVERLAP", `Esa hora se solapa con otro ${lane} del mismo día`);
  }
}

export async function listTemplates(): Promise<TemplateView[]> {
  const rows = await prisma.classTemplate.findMany({
    where: { active: true },
    include: { classType: true },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  return rows.map(toView);
}

export async function createTemplate(input: TemplateWrite, now = new Date()) {
  const startTime = normalizeClock(input.startTime);
  const endTime = normalizeClock(input.endTime);
  assertValidTimeRange(startTime, endTime);
  const classType = await requireClassType(input.classTypeId);
  await assertCoach(input.coachId);
  const candidate = {
    weekday: input.weekday,
    startTime,
    endTime,
    classTypeId: classType.id,
    kind: classType.kind,
    coachId: input.coachId ?? null,
    defaultCapacity: input.defaultCapacity,
  };
  const hours = await getBoxHours();
  const opening = hours.weekly.find((day) => day.weekday === candidate.weekday)?.intervals ?? [];
  if (!isWithinOpeningIntervals(opening, candidate.startTime, candidate.endTime)) {
    throw new BoxError(409, "SCHEDULE_CLOSED", "Ese hueco queda fuera del horario de apertura del box");
  }
  await assertNoOverlap(candidate);
  const today = localDateString(now);
  const range = horizonRange(today);
  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.classTemplate.create({
      data: {
        weekday: candidate.weekday,
        startTime: clockToDb(candidate.startTime),
        endTime: clockToDb(candidate.endTime),
        classTypeId: candidate.classTypeId,
        coachId: candidate.coachId,
        defaultCapacity: candidate.defaultCapacity,
        active: true,
      },
      include: { classType: true },
    });
    const createdCount = await ensureInstances(tx, range.from, range.to, created.id);
    return { view: toView(created), createdCount };
  });
  return { template: template.view, createdInstanceCount: template.createdCount };
}

export async function updateTemplate(id: string, patch: PatchTemplate, actorId: string, now = new Date()) {
  const existing = await prisma.classTemplate.findUnique({ where: { id }, include: { classType: true } });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "La plantilla no existe");
  if (!existing.active) {
    throw new BoxError(403, "FORBIDDEN", "Una plantilla dada de baja no se vuelve a activar");
  }
  const current = toView(existing);
  const classType =
    patch.classTypeId && patch.classTypeId !== current.classTypeId
      ? await requireClassType(patch.classTypeId)
      : existing.classType;
  const next: ClassTemplate = {
    id: current.id,
    weekday: patch.weekday ?? current.weekday,
    startTime: normalizeClock(patch.startTime ?? current.startTime),
    endTime: normalizeClock(patch.endTime ?? current.endTime),
    classTypeId: classType.id,
    kind: classType.kind,
    coachId: patch.coachId === undefined ? current.coachId : patch.coachId,
    defaultCapacity: patch.defaultCapacity ?? current.defaultCapacity,
    active: true,
  };
  assertValidTimeRange(next.startTime, next.endTime);
  const hours = await getBoxHours();
  const opening = hours.weekly.find((day) => day.weekday === next.weekday)?.intervals ?? [];
  if (!isWithinOpeningIntervals(opening, next.startTime, next.endTime)) {
    throw new BoxError(409, "SCHEDULE_CLOSED", "Ese hueco queda fuera del horario de apertura del box");
  }
  await assertCoach(next.coachId);
  await assertNoOverlap(next);
  const today = localDateString(now);
  const from = nextMondayDate(today);
  const to = horizonRange(today).to;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.classTemplate.update({
      where: { id },
      data: {
        weekday: next.weekday,
        startTime: clockToDb(next.startTime),
        endTime: clockToDb(next.endTime),
        classTypeId: next.classTypeId,
        coachId: next.coachId,
        defaultCapacity: next.defaultCapacity,
      },
      include: { classType: true },
    });
    const summary = await propagate(tx, id, actorId, today, now, {
      type: "update",
      template: next,
    });
    await ensureInstances(tx, from, to, id);
    return { template: toView(updated), summary };
  });
}

export async function deleteTemplate(id: string, actorId: string, now = new Date()) {
  const existing = await prisma.classTemplate.findUnique({ where: { id }, include: { classType: true } });
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
    include: { bookings: true, training: { select: { classTypeId: true } } },
  });
  const instances = rows.map(toDomainInstance);
  const bookings = rows.flatMap((row) => row.bookings.map(toDomainBooking));
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
        classTypeId: instance.classTypeId,
        kind: instance.kind,
        coachId: instance.coachId,
        capacity: instance.capacity,
        status: instance.status,
        trainingId: instance.trainingId,
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
    left.classTypeId === right.classTypeId &&
    left.kind === right.kind &&
    left.coachId === right.coachId &&
    left.capacity === right.capacity &&
    left.status === right.status &&
    left.trainingId === right.trainingId
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
