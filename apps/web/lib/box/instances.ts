import {
  assertSameDayMove,
  assertValidTimeRange,
  atBoxTime,
  cancelInstanceBookings,
  instanceConflicts,
  shouldCancelAllForCapacity,
  type CreateInstance,
  type PatchInstance,
} from "@78feet/domain";
import { prisma } from "../db";
import type { Db } from "./db";
import { BoxError } from "./errors";
import { requireClassType } from "./class-types";
import { toDomainBooking, toDomainInstance } from "./map";
import { isoDateFromDb, isoDateToDb, normalizeClock } from "./time";

function clocksFromInstance(startAt: Date, endAt: Date): { startTime: string; endTime: string } {
  const start = startAt.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const end = endAt.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return { startTime: start, endTime: end };
}

async function assertNoInstanceOverlap(
  db: Db,
  candidate: { id?: string; date: string; startAt: Date; endAt: Date },
): Promise<void> {
  const others = await db.classInstance.findMany({
    where: { date: isoDateToDb(candidate.date) },
  });
  if (instanceConflicts(candidate, others.map(toDomainInstance))) {
    throw new BoxError(409, "OVERLAP", "Esa hora se solapa con otra clase del mismo día");
  }
}

async function cancelActives(db: Db, instanceId: string, actorId: string, now: Date): Promise<number> {
  const actives = await db.booking.findMany({ where: { instanceId, status: "active" } });
  const cancelled = cancelInstanceBookings(actives.map(toDomainBooking), instanceId, now, actorId);
  let count = 0;
  for (const booking of cancelled) {
    if (booking.status !== "cancelled") continue;
    await db.booking.update({
      where: { id: booking.id },
      data: {
        status: "cancelled",
        quotaReturned: true,
        cancelledAt: now,
        cancelledBy: actorId,
      },
    });
    count += 1;
  }
  return count;
}

export async function createExtraInstance(input: CreateInstance, now = new Date()) {
  const classType = await requireClassType(input.classTypeId);
  const startTime = normalizeClock(input.startTime);
  const endTime = normalizeClock(input.endTime);
  assertValidTimeRange(startTime, endTime);
  const startAt = atBoxTime(input.date, startTime);
  const endAt = atBoxTime(input.date, endTime);
  await assertNoInstanceOverlap(prisma, { date: input.date, startAt, endAt });
  const row = await prisma.classInstance.create({
    data: {
      date: isoDateToDb(input.date),
      startAt,
      endAt,
      classTypeId: classType.id,
      kind: classType.kind,
      coachId: input.coachId ?? null,
      capacity: input.capacity,
      status: "scheduled",
      editedAt: now,
    },
  });
  return { id: row.id };
}

export async function patchInstance(id: string, patch: PatchInstance, actorId: string, now = new Date()) {
  const existing = await prisma.classInstance.findUnique({
    where: { id },
    include: { training: { select: { classTypeId: true } }, bookings: { where: { status: "active" } } },
  });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "La clase no existe");
  const date = isoDateFromDb(existing.date);
  assertSameDayMove(date, date);
  const clocks = clocksFromInstance(existing.startAt, existing.endAt);
  const startTime = normalizeClock(patch.startTime ?? clocks.startTime);
  const endTime = normalizeClock(patch.endTime ?? clocks.endTime);
  assertValidTimeRange(startTime, endTime);
  const startAt = atBoxTime(date, startTime);
  const endAt = atBoxTime(date, endTime);
  const classTypeId = patch.classTypeId ?? existing.classTypeId;
  const classType = classTypeId === existing.classTypeId ? null : await requireClassType(classTypeId);
  const kind = classType?.kind ?? existing.kind;
  const capacity = patch.capacity ?? existing.capacity;
  const status = patch.status ?? existing.status;
  const coachId = patch.coachId === undefined ? existing.coachId : patch.coachId;
  let trainingId = patch.trainingId === undefined ? existing.trainingId : patch.trainingId;

  if (trainingId) {
    const training = await prisma.training.findUnique({ where: { id: trainingId } });
    if (!training) throw new BoxError(404, "FORBIDDEN", "El entrenamiento no existe");
    if (training.classTypeId !== classTypeId) {
      throw new BoxError(400, "FORBIDDEN", "El entrenamiento tiene que ser del mismo tipo");
    }
  }
  if (existing.training && existing.training.classTypeId !== classTypeId && patch.trainingId === undefined) {
    trainingId = null;
  }

  const activeCount = existing.bookings.length;
  const typeChanged = classTypeId !== existing.classTypeId;
  const capacityDrops = shouldCancelAllForCapacity(capacity, activeCount);
  if (capacityDrops && patch.confirmCapacity !== true && !typeChanged && status !== "cancelled") {
    throw new BoxError(
      409,
      "CONFIRM_REQUIRED",
      activeCount === 1 ? "1 reserva se va a cancelar" : `${activeCount} reservas se van a cancelar`,
      { detachCount: activeCount },
    );
  }

  const timeChanged =
    startAt.getTime() !== existing.startAt.getTime() || endAt.getTime() !== existing.endAt.getTime();
  const edited =
    timeChanged ||
    typeChanged ||
    coachId !== existing.coachId ||
    capacity !== existing.capacity ||
    status !== existing.status ||
    trainingId !== existing.trainingId;

  return prisma.$transaction(async (tx) => {
    await assertNoInstanceOverlap(tx, { id, date, startAt, endAt });
    let cancelledBookingCount = 0;
    if (status === "cancelled" && existing.status !== "cancelled") {
      cancelledBookingCount = await cancelActives(tx, id, actorId, now);
    } else if (typeChanged || (capacityDrops && status === "scheduled")) {
      cancelledBookingCount = await cancelActives(tx, id, actorId, now);
    }
    await tx.classInstance.update({
      where: { id },
      data: {
        startAt,
        endAt,
        classTypeId,
        kind,
        coachId,
        capacity,
        status,
        trainingId,
        cancelReason:
          status === "cancelled"
            ? (patch.cancelReason ?? existing.cancelReason ?? "Cancelada por el box")
            : existing.cancelReason,
        editedAt: edited ? now : existing.editedAt,
      },
    });
    return { id, cancelledBookingCount };
  });
}
