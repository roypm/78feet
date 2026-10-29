import { addDays, rosterName } from "@78feet/domain";
import { prisma } from "../db";
import { BoxError } from "./errors";
import { ensureInstances } from "./materialize";
import { classTypeImageUrl } from "./images";
import { personName } from "./map";
import { isoDateFromDb, isoDateToDb } from "./time";
import { horizonRange, localDateString } from "@78feet/domain";

function spots(capacity: number, bookedCount: number): number {
  return Math.max(0, capacity - bookedCount);
}

export async function listDay(date: string, now = new Date()) {
  const today = localDateString(now);
  const horizon = horizonRange(today);
  await ensureInstances(prisma, horizon.from, horizon.to);
  const rows = await prisma.classInstance.findMany({
    where: { date: isoDateToDb(date) },
    include: {
      classType: true,
      coach: { select: { firstName: true, lastName: true } },
      bookings: {
        where: { status: "active" },
        include: { member: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        orderBy: [{ member: { firstName: "asc" } }, { member: { lastName: "asc" } }],
      },
    },
    orderBy: { startAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    date: isoDateFromDb(row.date),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    name: row.classType.name,
    classTypeId: row.classTypeId,
    imageUrl: classTypeImageUrl(row.classType.imageKey),
    kind: row.kind,
    status: row.status,
    capacity: row.capacity,
    bookedCount: row.bookings.length,
    freeSpots: spots(row.capacity, row.bookings.length),
    coachName: personName(row.coach),
    trainingId: row.trainingId,
    roster: row.bookings.map((booking) => ({
      bookingId: booking.id,
      userId: booking.member.id,
      name: `${booking.member.firstName} ${booking.member.lastName}`.trim(),
      shortName: rosterName(booking.member.firstName, booking.member.lastName),
      phone: booking.member.phone,
    })),
  }));
}

export async function listWeek(from: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    throw new BoxError(400, "FORBIDDEN", "Fecha inválida");
  }
  const today = localDateString(now);
  const horizon = horizonRange(today);
  await ensureInstances(prisma, horizon.from, horizon.to);
  const to = addDays(from, 6);
  const rows = await prisma.classInstance.findMany({
    where: { date: { gte: isoDateToDb(from), lte: isoDateToDb(to) } },
    include: {
      classType: true,
      coach: { select: { firstName: true, lastName: true } },
      bookings: { where: { status: "active" }, select: { id: true } },
    },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    date: isoDateFromDb(row.date),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    name: row.classType.name,
    classTypeId: row.classTypeId,
    imageUrl: classTypeImageUrl(row.classType.imageKey),
    kind: row.kind,
    status: row.status,
    capacity: row.capacity,
    bookedCount: row.bookings.length,
    freeSpots: spots(row.capacity, row.bookings.length),
    coachName: personName(row.coach),
    bookedByMe: false,
  }));
}

export async function getStaffInstance(id: string) {
  const row = await prisma.classInstance.findUnique({
    where: { id },
    include: {
      classType: true,
      coach: { select: { id: true, firstName: true, lastName: true } },
      training: { include: { classType: true } },
      bookings: {
        where: { status: "active" },
        include: { member: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        orderBy: [{ member: { firstName: "asc" } }, { member: { lastName: "asc" } }],
      },
    },
  });
  if (!row) throw new BoxError(404, "FORBIDDEN", "La clase no existe");
  return {
    id: row.id,
    date: isoDateFromDb(row.date),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    name: row.classType.name,
    classTypeId: row.classTypeId,
    imageUrl: classTypeImageUrl(row.classType.imageKey),
    kind: row.kind,
    status: row.status,
    capacity: row.capacity,
    bookedCount: row.bookings.length,
    freeSpots: spots(row.capacity, row.bookings.length),
    coachId: row.coachId,
    coachName: personName(row.coach),
    trainingId: row.trainingId,
    trainingName: row.training?.name ?? null,
    editedAt: row.editedAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,
    roster: row.bookings.map((booking) => ({
      bookingId: booking.id,
      userId: booking.member.id,
      name: `${booking.member.firstName} ${booking.member.lastName}`.trim(),
      phone: booking.member.phone,
    })),
  };
}
