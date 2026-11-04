import {
  assertSameDayMove,
  assertValidTimeRange,
  atBoxTime,
  cancelInstanceBookings,
  instanceConflicts,
  shouldCancelAllForCapacity,
  weekdayMonday1,
  type CreateInstance,
  type PatchInstance,
} from "@78feet/domain";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import type { Db } from "./db";
import { BoxError } from "./errors";
import { requireClassType } from "./class-types";
import { toDomainBooking, toDomainInstance } from "./map";
import { clockFromDb, isoDateFromDb, isoDateToDb, normalizeClock } from "./time";
import { getBoxHours, isDateOpenDuring, primaryBoxId } from "./hours";

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
  candidate: { id?: string; boxId: string; date: string; startAt: Date; endAt: Date; kind: "directed" | "open" },
): Promise<void> {
  const others = await db.classInstance.findMany({
    where: { date: isoDateToDb(candidate.date), boxId: candidate.boxId },
  });
  if (instanceConflicts(candidate, others.map(toDomainInstance))) {
    const lane = candidate.kind === "open" ? "open" : "clase dirigida";
    throw new BoxError(409, "OVERLAP", `Esa hora se solapa con otro ${lane} del mismo día`);
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
  const boxId = input.boxId ?? await primaryBoxId();
  if (input.boxId) {
    const box = await prisma.box.findUnique({ where: { id: input.boxId }, select: { id: true } });
    if (!box) throw new BoxError(404, "FORBIDDEN", "El box no existe");
  }
  if (!isDateOpenDuring(await getBoxHours(prisma, boxId), input.date, startTime, endTime)) {
    throw new BoxError(409, "SCHEDULE_CLOSED", "El box está cerrado en ese horario");
  }
  await assertNoInstanceOverlap(prisma, { boxId, date: input.date, startAt, endAt, kind: classType.kind });
  const row = await prisma.classInstance.create({
    data: {
      boxId,
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

export async function removeExtraInstance(id: string, actorId: string, now = new Date()) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.classInstance.findUnique({
        where: { id },
        include: { bookings: { select: { id: true, status: true } } },
      });
      if (!existing) throw new BoxError(404, "FORBIDDEN", "La clase no existe");
      if (existing.templateId !== null) {
        throw new BoxError(409, "FORBIDDEN", "Solo se pueden quitar clases extra desde esta acción");
      }
      if (existing.startAt <= now) {
        throw new BoxError(409, "FORBIDDEN", "Solo se pueden quitar clases que todavía no empezaron");
      }

      if (existing.bookings.length === 0) {
        await tx.classInstance.delete({ where: { id } });
        return { deleted: true, cancelledBookingCount: 0 };
      }

      const cancelledBookingCount = await cancelActives(tx, id, actorId, now);
      await tx.classInstance.update({
        where: { id },
        data: { status: "cancelled", cancelReason: "Clase extra retirada", editedAt: now },
      });
      return { deleted: false, cancelledBookingCount };
    });
  } catch (error) {
    // A booking can be created between the history check and deletion. The FK
    // protects it; in that race, keep the class as a cancelled history row.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2003") throw error;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.classInstance.findUnique({ where: { id } });
      if (!existing) throw new BoxError(404, "FORBIDDEN", "La clase no existe");
      if (existing.templateId !== null) {
        throw new BoxError(409, "FORBIDDEN", "Solo se pueden quitar clases extra desde esta acción");
      }
      if (existing.startAt <= now) {
        throw new BoxError(409, "FORBIDDEN", "Solo se pueden quitar clases que todavía no empezaron");
      }
      const cancelledBookingCount = await cancelActives(tx, id, actorId, now);
      await tx.classInstance.update({
        where: { id },
        data: { status: "cancelled", cancelReason: "Clase extra retirada", editedAt: now },
      });
      return { deleted: false, cancelledBookingCount };
    });
  }
}

export async function restoreInstanceFromTemplate(id: string, actorId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.classInstance.findUnique({
      where: { id },
      include: {
        template: { include: { classType: true } },
        training: { select: { classTypeId: true } },
        bookings: { where: { status: "active" } },
      },
    });
    if (!existing) throw new BoxError(404, "FORBIDDEN", "La clase no existe");
    if (existing.templateId === null || existing.editedAt === null) {
      throw new BoxError(409, "FORBIDDEN", "Esta clase no tiene cambios puntuales que restaurar");
    }
    if (!existing.template?.active) {
      throw new BoxError(409, "FORBIDDEN", "La plantilla ya no está activa y no se puede restaurar");
    }
    if (existing.startAt <= now) {
      throw new BoxError(409, "FORBIDDEN", "Solo se pueden restaurar clases que todavía no empezaron");
    }

    const date = isoDateFromDb(existing.date);
    if (weekdayMonday1(date) !== existing.template.weekday) {
      throw new BoxError(409, "FORBIDDEN", "La plantilla ahora corresponde a otro día de la semana");
    }
    const startTime = normalizeClock(clockFromDb(existing.template.startTime));
    const endTime = normalizeClock(clockFromDb(existing.template.endTime));
    assertValidTimeRange(startTime, endTime);
    const startAt = atBoxTime(date, startTime);
    const endAt = atBoxTime(date, endTime);
    const classTypeId = existing.template.classTypeId;
    const kind = existing.template.classType.kind;
    const capacity = existing.template.defaultCapacity;
    const typeChanged = classTypeId !== existing.classTypeId;
    const capacityDrops = shouldCancelAllForCapacity(capacity, existing.bookings.length);
    const trainingId =
      existing.training && existing.training.classTypeId !== classTypeId ? null : existing.trainingId;

    const hours = await getBoxHours(tx, existing.boxId);
    if (!isDateOpenDuring(hours, date, startTime, endTime)) {
      throw new BoxError(409, "SCHEDULE_CLOSED", "El horario actual de apertura no permite restaurar esta clase");
    }

    await assertNoInstanceOverlap(tx, { id, boxId: existing.boxId, date, startAt, endAt, kind });
    let cancelledBookingCount = 0;
    if (typeChanged || capacityDrops) {
      cancelledBookingCount = await cancelActives(tx, id, actorId, now);
    }
    await tx.classInstance.update({
      where: { id },
      data: {
        startAt,
        endAt,
        classTypeId,
        kind,
        coachId: existing.template.coachId,
        capacity,
        status: "scheduled",
        trainingId,
        cancelReason: null,
        editedAt: null,
      },
    });
    return { id, cancelledBookingCount };
  });
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
  if (existing.status === "cancelled" && status === "scheduled" && existing.startAt <= now) {
    throw new BoxError(409, "FORBIDDEN", "No se puede recuperar una clase que ya empezó");
  }
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

  if (status === "scheduled" && !isDateOpenDuring(await getBoxHours(prisma, existing.boxId), date, startTime, endTime)) {
    throw new BoxError(409, "SCHEDULE_CLOSED", "El box está cerrado en ese horario");
  }

  return prisma.$transaction(async (tx) => {
    await assertNoInstanceOverlap(tx, { id, boxId: existing.boxId, date, startAt, endAt, kind });
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
            : null,
        editedAt: edited ? now : existing.editedAt,
      },
    });
    return { id, cancelledBookingCount };
  });
}
