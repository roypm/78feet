import {
  DomainError,
  evaluateBooking,
  evaluateMemberCancellation,
  evaluateStaffCancellation,
  memberCanCancel,
  weekStartDate,
  weeklyQuotaAdjustmentTotal,
  type Booking,
  type BookingPool,
  type ClassInstance,
} from "@78feet/domain";
import { prisma } from "../db";
import { isUniqueViolation } from "./db";
import { BoxError } from "./errors";
import { toDomainBooking, toDomainInstance } from "./map";
import { isoDateFromDb, isoDateToDb } from "./time";
import { listWeeklyQuotaAdjustments } from "./weekly-quota-adjustments";

type InstanceRow = {
  id: string;
  templateId: string | null;
  date: Date;
  startAt: Date;
  endAt: Date;
  classTypeId: string;
  kind: "directed" | "open";
  coachId: string | null;
  capacity: number;
  status: "scheduled" | "cancelled";
  trainingId: string | null;
  editedAt: Date | null;
  classType: { name: string };
};

type BookingRow = {
  id: string;
  instanceId: string;
  userId: string;
  pool: BookingPool;
  status: "active" | "cancelled";
  quotaReturned: boolean | null;
  createdBy: string;
  createdAt: Date;
  cancelledAt: Date | null;
  cancelledBy: string | null;
};

export type BookingView = {
  id: string;
  instanceId: string;
  userId: string;
  pool: BookingPool;
  status: "active" | "cancelled";
  quotaReturned: boolean | null;
  createdBy: string;
  createdAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  instance: {
    id: string;
    date: string;
    name: string;
    kind: "directed" | "open";
    startAt: string;
    endAt: string;
    capacity: number;
    status: "scheduled" | "cancelled";
  };
};

function toView(row: BookingRow, instance: InstanceRow): BookingView {
  return {
    id: row.id,
    instanceId: row.instanceId,
    userId: row.userId,
    pool: row.pool,
    status: row.status,
    quotaReturned: row.quotaReturned,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelledBy: row.cancelledBy,
    instance: {
      id: instance.id,
      date: isoDateFromDb(instance.date),
      name: instance.classType.name,
      kind: instance.kind,
      startAt: instance.startAt.toISOString(),
      endAt: instance.endAt.toISOString(),
      capacity: instance.capacity,
      status: instance.status,
    },
  };
}

export async function reserveForMember(params: {
  memberId: string;
  instanceId: string;
  createdBy: string;
  now?: Date;
}): Promise<BookingView> {
  const now = params.now ?? new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "class_instance" WHERE id = ${params.instanceId}::uuid FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new BoxError(404, "FORBIDDEN", "La clase no existe");
      }

      const instance = await tx.classInstance.findUnique({
        where: { id: params.instanceId },
        include: { classType: { select: { name: true } } },
      });
      if (!instance) throw new BoxError(404, "FORBIDDEN", "La clase no existe");

      const user = await tx.user.findUnique({ where: { id: params.memberId } });
      if (!user || user.role !== "member") {
        throw new BoxError(404, "FORBIDDEN", "El socio no existe");
      }
      if (user.status !== "active") {
        throw new BoxError(403, "FORBIDDEN", "El socio está de baja");
      }

      const membership = await tx.membership.findFirst({
        where: { userId: user.id, endedAt: null },
        include: { tariff: true },
      });
      const grants = await tx.creditGrant.findMany({
        where: { userId: user.id },
        select: { userId: true, quantity: true },
      });
      const weekStart = weekStartDate(isoDateFromDb(instance.date));
      const adjustments = await listWeeklyQuotaAdjustments(tx, user.id, isoDateToDb(weekStart));
      const onInstance = await tx.booking.findMany({
        where: { instanceId: instance.id, status: "active" },
      });
      const own = await tx.booking.findMany({
        where: {
          userId: user.id,
          OR: [{ status: "active" }, { quotaReturned: false }],
        },
        include: { instance: { include: { classType: { select: { name: true } } } } },
      });

      const domainInstance = toDomainInstance(instance);
      const bookings = new Map<string, Booking>();
      const instancesById = new Map<string, Pick<ClassInstance, "date" | "startAt" | "endAt">>();
      instancesById.set(domainInstance.id, domainInstance);
      for (const row of onInstance) bookings.set(row.id, toDomainBooking(row));
      for (const row of own) {
        bookings.set(row.id, toDomainBooking(row));
        instancesById.set(row.instance.id, toDomainInstance(row.instance));
      }

      const decision = evaluateBooking({
        now,
        instance: domainInstance,
        membership: membership
          ? { userId: membership.userId, tariffId: membership.tariffId, endedAt: membership.endedAt }
          : null,
        tariff: membership
          ? {
              id: membership.tariff.id,
              kind: membership.tariff.kind,
              weeklyDirected: membership.tariff.weeklyDirected,
              weeklyOpen: membership.tariff.weeklyOpen,
            }
          : null,
        userId: user.id,
        bookings: [...bookings.values()],
        instancesById,
        grants,
        weeklyDirectedAdjustment: weeklyQuotaAdjustmentTotal(adjustments, "directed"),
        weeklyOpenAdjustment: weeklyQuotaAdjustmentTotal(adjustments, "open"),
      });

      const created = await tx.booking.create({
        data: {
          instanceId: instance.id,
          userId: user.id,
          pool: decision.pool,
          status: "active",
          createdBy: params.createdBy,
        },
      });
      return toView(created, instance);
    }, { timeout: 20_000 });
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("OVERLAP");
    throw error;
  }
}

export async function cancelMemberBooking(
  bookingId: string,
  actorId: string,
  now = new Date(),
): Promise<BookingView> {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { instance: { include: { classType: { select: { name: true } } } } },
  });
  if (!existing || existing.status !== "active" || existing.userId !== actorId) {
    throw new BoxError(404, "FORBIDDEN", "La reserva no existe");
  }
  const decision = evaluateMemberCancellation(now, existing.instance.startAt);
  const updated = await prisma.booking.update({
    where: { id: existing.id },
    data: {
      status: "cancelled",
      quotaReturned: decision.quotaReturned,
      cancelledAt: now,
      cancelledBy: actorId,
    },
  });
  return toView(updated, existing.instance);
}

export async function cancelStaffBooking(
  bookingId: string,
  actorId: string,
  returnQuota: boolean,
  now = new Date(),
): Promise<BookingView> {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { instance: { include: { classType: { select: { name: true } } } } },
  });
  if (!existing || existing.status !== "active") {
    throw new BoxError(404, "FORBIDDEN", "La reserva no existe");
  }
  const decision = evaluateStaffCancellation(returnQuota);
  const updated = await prisma.booking.update({
    where: { id: existing.id },
    data: {
      status: "cancelled",
      quotaReturned: decision.quotaReturned,
      cancelledAt: now,
      cancelledBy: actorId,
    },
  });
  return toView(updated, existing.instance);
}

export type MemberBookingView = BookingView & {
  canCancel: boolean;
  boxCancelled: boolean;
};

export async function listUpcomingBookings(userId: string, now = new Date()): Promise<MemberBookingView[]> {
  const rows = await prisma.booking.findMany({
    where: {
      userId,
      OR: [
        { status: "active", instance: { status: "scheduled", startAt: { gt: now } } },
        {
          status: "cancelled",
          quotaReturned: true,
          instance: { status: "cancelled", startAt: { gt: now } },
        },
      ],
    },
    include: { instance: { include: { classType: { select: { name: true } } } } },
    orderBy: { instance: { startAt: "asc" } },
  });
  return rows.map((row) => ({
    ...toView(row, row.instance),
    canCancel: row.status === "active" && memberCanCancel(now, row.instance.startAt),
    boxCancelled: row.instance.status === "cancelled",
  }));
}

export type HistoryBookingView = MemberBookingView & {
  coachName: string | null;
};

function personName(person: { firstName: string; lastName: string } | null): string | null {
  if (!person) return null;
  const name = `${person.firstName} ${person.lastName}`.trim();
  return name.length > 0 ? name : null;
}

export async function listBookingHistory(userId: string, now = new Date()): Promise<HistoryBookingView[]> {
  const rows = await prisma.booking.findMany({
    where: {
      userId,
      instance: { startAt: { lte: now } },
    },
    include: {
      instance: {
        include: {
          classType: { select: { name: true } },
          coach: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ instance: { startAt: "desc" } }, { createdAt: "desc" }],
  });
  return rows.map((row) => ({
    ...toView(row, row.instance),
    canCancel: row.status === "active" && memberCanCancel(now, row.instance.startAt),
    boxCancelled: row.instance.status === "cancelled",
    coachName: personName(row.instance.coach),
  }));
}
