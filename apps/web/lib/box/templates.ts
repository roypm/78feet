import {
  assertValidTimeRange,
  atBoxTime,
  isWithinOpeningIntervals,
  horizonRange,
  localDateString,
  nextMondayDate,
  propagateTemplateChange,
  templateConflicts,
  weekdayMonday1,
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
import { persistPropagationChanges } from "./propagation-persistence";
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
  const coach = await prisma.user.findUnique({
    where: { id: coachId },
    select: { role: true, status: true },
  });
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
  const [classType, , hours] = await Promise.all([
    requireClassType(input.classTypeId),
    assertCoach(input.coachId),
    getBoxHours(),
  ]);
  const candidate = {
    weekday: input.weekday,
    startTime,
    endTime,
    classTypeId: classType.id,
    kind: classType.kind,
    coachId: input.coachId ?? null,
    defaultCapacity: input.defaultCapacity,
  };
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
  const [hours] = await Promise.all([getBoxHours(), assertCoach(next.coachId)]);
  const opening = hours.weekly.find((day) => day.weekday === next.weekday)?.intervals ?? [];
  if (!isWithinOpeningIntervals(opening, next.startTime, next.endTime)) {
    throw new BoxError(409, "SCHEDULE_CLOSED", "Ese hueco queda fuera del horario de apertura del box");
  }
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
  const include = {
    bookings: {
      where: { status: "active" as const },
      select: {
        id: true,
        instanceId: true,
        userId: true,
        pool: true,
        status: true,
        quotaReturned: true,
        createdBy: true,
        cancelledAt: true,
        cancelledBy: true,
      },
    },
    training: { select: { classTypeId: true } },
  } as const;
  const sourceRows = await tx.classInstance.findMany({
    where: { templateId, date: { gte: from }, editedAt: null },
    include,
  });
  const sourceInstances = sourceRows.map(toDomainInstance);
  const successorIdentities = templateSuccessorIdentities(sourceInstances, change);
  const successorRows = successorIdentities.length
    ? await tx.classInstance.findMany({
        where: {
          status: "scheduled",
          OR: successorIdentities.map((identity) => ({
            date: isoDateToDb(identity.date),
            startAt: identity.startAt,
            endAt: identity.endAt,
            classTypeId: identity.classTypeId,
          })),
        },
        include,
      })
    : [];
  const rowsById = new Map([...sourceRows, ...successorRows].map((row) => [row.id, row]));
  const rows = [...rowsById.values()];
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
  await persistPropagationChanges(tx, result, instances, bookings, actorId);
  return result.summary;
}

function templateSuccessorIdentities(
  instances: readonly ClassInstance[],
  change: Parameters<typeof propagateTemplateChange>[0]["change"],
): { date: string; startAt: Date; endAt: Date; classTypeId: string }[] {
  const identities = new Map<string, { date: string; startAt: Date; endAt: Date; classTypeId: string }>();
  for (const instance of instances) {
    let identity: { date: string; startAt: Date; endAt: Date; classTypeId: string } | null = null;
    if (change.type === "delete" || weekdayMonday1(instance.date) !== change.template.weekday) {
      identity = {
        date: instance.date,
        startAt: instance.startAt,
        endAt: instance.endAt,
        classTypeId: instance.classTypeId,
      };
    } else {
      const startAt = atBoxTime(instance.date, change.template.startTime);
      const endAt = atBoxTime(instance.date, change.template.endTime);
      if (
        startAt.getTime() !== instance.startAt.getTime() ||
        endAt.getTime() !== instance.endAt.getTime() ||
        change.template.classTypeId !== instance.classTypeId
      ) {
        identity = {
          date: instance.date,
          startAt,
          endAt,
          classTypeId: change.template.classTypeId,
        };
      }
    }
    if (!identity) continue;
    const key = `${identity.date}|${identity.startAt.toISOString()}|${identity.endAt.toISOString()}|${identity.classTypeId}`;
    identities.set(key, identity);
  }
  return [...identities.values()];
}
