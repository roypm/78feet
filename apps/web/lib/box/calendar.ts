import {
  horizonRange,
  instanceHasStarted,
  localDateString,
  memberCanCancel,
  rosterName,
} from "@78feet/domain";
import { prisma } from "../db";
import { BoxError } from "./errors";
import { ensureInstances } from "./materialize";
import { isoDateFromDb, isoDateToDb } from "./time";

export type CalendarClass = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  title: string;
  kind: "directed" | "open";
  status: "scheduled" | "cancelled";
  capacity: number;
  bookedCount: number;
  freeSpots: number;
  coachName: string | null;
  bookedByMe: boolean;
};

export type InstanceDetail = CalendarClass & {
  roster: string[];
  bookingId: string | null;
  canBook: boolean;
  canCancel: boolean;
};

function coachName(coach: { firstName: string; lastName: string } | null): string | null {
  if (!coach) return null;
  const name = `${coach.firstName} ${coach.lastName}`.trim();
  return name.length > 0 ? name : null;
}

function spots(capacity: number, bookedCount: number): number {
  return Math.max(0, capacity - bookedCount);
}

export async function listCalendar(
  userId: string,
  from: string,
  to: string,
  now = new Date(),
): Promise<CalendarClass[]> {
  if (from > to) throw new BoxError(400, "FORBIDDEN", "El rango de fechas no es válido");
  const today = localDateString(now);
  const horizon = horizonRange(today);
  await ensureInstances(prisma, horizon.from, horizon.to);
  const start = from < today ? today : from;
  const end = to > horizon.to ? horizon.to : to;
  if (start > end) return [];

  const rows = await prisma.classInstance.findMany({
    where: { date: { gte: isoDateToDb(start), lte: isoDateToDb(end) } },
    include: {
      coach: { select: { firstName: true, lastName: true } },
      bookings: { where: { status: "active" }, select: { userId: true } },
    },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });

  return rows.map((row) => {
    const bookedCount = row.bookings.length;
    return {
      id: row.id,
      date: isoDateFromDb(row.date),
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      title: row.title,
      kind: row.kind,
      status: row.status,
      capacity: row.capacity,
      bookedCount,
      freeSpots: spots(row.capacity, bookedCount),
      coachName: coachName(row.coach),
      bookedByMe: row.bookings.some((booking) => booking.userId === userId),
    };
  });
}

export async function getInstanceDetail(
  userId: string,
  instanceId: string,
  now = new Date(),
): Promise<InstanceDetail> {
  const today = localDateString(now);
  const horizon = horizonRange(today);
  await ensureInstances(prisma, horizon.from, horizon.to);

  const row = await prisma.classInstance.findUnique({
    where: { id: instanceId },
    include: {
      coach: { select: { firstName: true, lastName: true } },
      bookings: {
        where: { status: "active" },
        include: { member: { select: { firstName: true, lastName: true } } },
        orderBy: [{ member: { firstName: "asc" } }, { member: { lastName: "asc" } }],
      },
    },
  });
  if (!row) throw new BoxError(404, "FORBIDDEN", "La clase no existe");

  const mine = row.bookings.find((booking) => booking.userId === userId) ?? null;
  const bookedCount = row.bookings.length;
  const freeSpots = spots(row.capacity, bookedCount);
  const started = instanceHasStarted(now, row.startAt);
  return {
    id: row.id,
    date: isoDateFromDb(row.date),
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    title: row.title,
    kind: row.kind,
    status: row.status,
    capacity: row.capacity,
    bookedCount,
    freeSpots,
    coachName: coachName(row.coach),
    bookedByMe: mine !== null,
    roster: row.bookings.map((booking) => rosterName(booking.member.firstName, booking.member.lastName)),
    bookingId: mine?.id ?? null,
    canBook: row.status === "scheduled" && !started && freeSpots > 0 && mine === null,
    canCancel: mine !== null && memberCanCancel(now, row.startAt),
  };
}
