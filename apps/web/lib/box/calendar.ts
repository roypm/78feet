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
import { classTypeImageUrl } from "./images";
import { personName } from "./map";
import { isoDateFromDb, isoDateToDb } from "./time";
import { isCalendarException } from "./exceptions";

export type CalendarClass = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  name: string;
  classTypeId: string;
  imageUrl: string;
  kind: "directed" | "open";
  status: "scheduled" | "cancelled";
  capacity: number;
  bookedCount: number;
  freeSpots: number;
  coachName: string | null;
  bookedByMe: boolean;
  isException: boolean;
};

export type TrainingDetail = {
  id: string;
  name: string;
  classTypeName: string;
  phases: { id: string; name: string; blocks: { id: string; body: string }[] }[];
};

export type InstanceDetail = CalendarClass & {
  roster: string[];
  bookingId: string | null;
  canBook: boolean;
  canCancel: boolean;
  training: TrainingDetail | null;
};

function spots(capacity: number, bookedCount: number): number {
  return Math.max(0, capacity - bookedCount);
}

function toCalendarClass(
  row: {
    id: string;
    date: Date;
    startAt: Date;
    endAt: Date;
    classTypeId: string;
    kind: "directed" | "open";
    status: "scheduled" | "cancelled";
    capacity: number;
    classType: { name: string; imageKey: string };
    coach: { firstName: string; lastName: string } | null;
    bookings: { userId: string }[];
    templateId: string | null;
    editedAt: Date | null;
  },
  userId: string | null,
): CalendarClass {
  const bookedCount = row.bookings.length;
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
    bookedCount,
    freeSpots: spots(row.capacity, bookedCount),
    coachName: personName(row.coach),
    bookedByMe: userId ? row.bookings.some((booking) => booking.userId === userId) : false,
    isException: isCalendarException(row),
  };
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
      classType: true,
      coach: { select: { firstName: true, lastName: true } },
      bookings: { where: { status: "active" }, select: { userId: true } },
    },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });

  return rows.map((row) => toCalendarClass(row, userId));
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
      classType: true,
      coach: { select: { firstName: true, lastName: true } },
      training: {
        include: {
          classType: true,
          phases: {
            include: { blocks: { orderBy: { position: "asc" } } },
            orderBy: { position: "asc" },
          },
        },
      },
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
  const base = toCalendarClass(row, userId);
  return {
    ...base,
    roster: row.bookings.map((booking) => rosterName(booking.member.firstName, booking.member.lastName)),
    bookingId: mine?.id ?? null,
    canBook: row.status === "scheduled" && !started && freeSpots > 0 && mine === null,
    canCancel: mine !== null && memberCanCancel(now, row.startAt),
    training: row.training
      ? {
          id: row.training.id,
          name: row.training.name,
          classTypeName: row.training.classType.name,
          phases: row.training.phases.map((phase) => ({
            id: phase.id,
            name: phase.name,
            blocks: phase.blocks.map((block) => ({ id: block.id, body: block.body })),
          })),
        }
      : null,
  };
}
