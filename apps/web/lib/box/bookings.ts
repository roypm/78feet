import {
  DomainError,
  evaluateBooking,
  evaluateMemberCancellation,
  evaluateStaffCancellation,
  memberCanCancel,
  quotaPeriodForConsumption,
  quotaPeriodStartDate,
  quotaAdjustmentTotal,
  type Booking,
  type BookingPool,
  type ClassInstance,
} from "@78feet/domain";
import { Prisma } from "@prisma/client";
import { memberConsumption } from "./consumption";
import { prisma } from "../db";
import { isUniqueViolation } from "./db";
import { lockInstanceRow, lockUserRow } from "./locks";
import { BoxError } from "./errors";
import { toDomainBooking, toDomainInstance } from "./map";
import { isoDateFromDb, isoDateToDb } from "./time";
import { listQuotaAdjustments } from "./quota-adjustments";
import { paginate } from "./pagination";
import { profileImageUrl } from "./profile-images";

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
  box?: { name: string } | null;
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
    boxName: string;
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
      boxName: instance.box?.name ?? "",
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
    return await prisma.$transaction(
      async (tx) => {
        await lockInstanceRow(tx, params.instanceId);
        await lockUserRow(tx, params.memberId);

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
        const classDate = isoDateFromDb(instance.date);
        const quotaPeriod = membership ? quotaPeriodForConsumption(membership.tariff.consumptionModel) : null;
        const adjustments = quotaPeriod
          ? await listQuotaAdjustments(
              tx,
              user.id,
              quotaPeriod,
              isoDateToDb(quotaPeriodStartDate(classDate, quotaPeriod)),
            )
          : [];
        const onInstance = await tx.booking.findMany({
          where: { instanceId: instance.id, status: "active" },
        });
        const own = await tx.booking.findMany({
          where: {
            userId: user.id,
            status: "active",
            instance: { startAt: { lt: instance.endAt }, endAt: { gt: instance.startAt } },
          },
          include: {
            instance: { include: { classType: { select: { name: true } }, box: { select: { name: true } } } },
          },
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

        const consumption = await memberConsumption(tx, user.id, classDate, quotaPeriod);
        const decision = evaluateBooking({
          now,
          instance: domainInstance,
          membership: membership
            ? { userId: membership.userId, tariffId: membership.tariffId, endedAt: membership.endedAt }
            : null,
          tariff: membership
            ? {
                id: membership.tariff.id,
                consumptionModel: membership.tariff.consumptionModel,
                quotaDirected: membership.tariff.quotaDirected,
                quotaOpen: membership.tariff.quotaOpen,
              }
            : null,
          userId: user.id,
          bookings: [...bookings.values()],
          instancesById,
          grants: [],
          consumption,
          directedAdjustment: quotaAdjustmentTotal(adjustments, "directed"),
          openAdjustment: quotaAdjustmentTotal(adjustments, "open"),
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
      },
      { timeout: 20_000 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError("OVERLAP");
    throw error;
  }
}

export async function cancelMemberBooking(bookingId: string, actorId: string, now = new Date()): Promise<BookingView> {
  return cancelBooking(bookingId, actorId, true, now, true);
}

export async function cancelStaffBooking(
  bookingId: string,
  actorId: string,
  returnQuota: boolean,
  now = new Date(),
): Promise<BookingView> {
  return cancelBooking(bookingId, actorId, returnQuota, now, false);
}

async function cancelBooking(
  bookingId: string,
  actorId: string,
  returnQuota: boolean,
  now: Date,
  memberOnly: boolean,
): Promise<BookingView> {
  const target = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { instanceId: true, userId: true },
  });
  if (!target || (memberOnly && target.userId !== actorId))
    throw new BoxError(404, "FORBIDDEN", "La reserva no existe");
  return prisma.$transaction(async (tx) => {
    await lockInstanceRow(tx, target.instanceId);
    await lockUserRow(tx, target.userId);
    const existing = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { instance: { include: { classType: { select: { name: true } }, box: { select: { name: true } } } } },
    });
    if (!existing || existing.status !== "active") throw new BoxError(404, "FORBIDDEN", "La reserva no existe");
    const decision = memberOnly
      ? evaluateMemberCancellation(now, existing.instance.startAt)
      : evaluateStaffCancellation(returnQuota);
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: "active" },
      data: { status: "cancelled", quotaReturned: decision.quotaReturned, cancelledAt: now, cancelledBy: actorId },
    });
    if (updated.count === 0) throw new BoxError(404, "FORBIDDEN", "La reserva no existe");
    return toView(
      {
        ...existing,
        status: "cancelled",
        quotaReturned: decision.quotaReturned,
        cancelledAt: now,
        cancelledBy: actorId,
      },
      existing.instance,
    );
  });
}

export type MemberBookingView = BookingView & {
  canCancel: boolean;
  boxCancelled: boolean;
};

export async function listUpcomingBookings(userId: string, now = new Date()): Promise<MemberBookingView[]> {
  const rows = await prisma.booking.findMany({
    where: upcomingWhere(userId, now),
    include: { instance: { include: { classType: { select: { name: true } }, box: { select: { name: true } } } } },
    orderBy: { instance: { startAt: "asc" } },
  });
  return rows.map((row) => mapUpcomingRow(row, now));
}

function upcomingWhere(userId: string, now: Date): Prisma.BookingWhereInput {
  return {
    userId,
    OR: [
      { status: "active", instance: { status: "scheduled", startAt: { gt: now } } },
      {
        status: "cancelled",
        quotaReturned: true,
        instance: { status: "cancelled", startAt: { gt: now } },
      },
    ],
  };
}

function mapUpcomingRow(
  row: BookingRow & { instance: InstanceRow & { classType: { name: string }; box: { name: string } } },
  now: Date,
): MemberBookingView {
  return {
    ...toView(row, row.instance),
    canCancel: row.status === "active" && memberCanCancel(now, row.instance.startAt),
    boxCancelled: row.instance.status === "cancelled",
  };
}

export async function listUpcomingBookingsPage(userId: string, page = 1, now = new Date()) {
  const where = upcomingWhere(userId, now);
  const total = await prisma.booking.count({ where });
  return paginate(total, page, async (window) => {
    const rows = await prisma.booking.findMany({
      where,
      include: { instance: { include: { classType: { select: { name: true } }, box: { select: { name: true } } } } },
      orderBy: { instance: { startAt: "asc" } },
      skip: window.skip,
      take: window.take,
    });
    return rows.map((row) => mapUpcomingRow(row, now));
  });
}

export type HistoryBookingView = MemberBookingView & {
  coachName: string | null;
  coachProfileImageUrl: string | null;
};

function personName(person: { firstName: string; lastName: string } | null): string | null {
  if (!person) return null;
  const name = `${person.firstName} ${person.lastName}`.trim();
  return name.length > 0 ? name : null;
}

function historyWhere(userId: string, now: Date) {
  return {
    userId,
    instance: { startAt: { lte: now } },
  } as const;
}

function mapHistoryRow(
  row: BookingRow & {
    instance: InstanceRow & {
      coach: { id: string; firstName: string; lastName: string; profileImage: { updatedAt: Date } | null } | null;
    };
  },
  now: Date,
): HistoryBookingView {
  return {
    ...toView(row, row.instance),
    canCancel: row.status === "active" && memberCanCancel(now, row.instance.startAt),
    boxCancelled: row.instance.status === "cancelled",
    coachName: personName(row.instance.coach),
    coachProfileImageUrl: row.instance.coach
      ? profileImageUrl(row.instance.coach.id, row.instance.coach.profileImage?.updatedAt)
      : null,
  };
}

const historyInclude = {
  instance: {
    include: {
      classType: { select: { name: true } },
      box: { select: { name: true } },
      coach: { select: { id: true, firstName: true, lastName: true, profileImage: { select: { updatedAt: true } } } },
    },
  },
};

export async function listBookingHistoryPage(userId: string, page = 1, now = new Date()) {
  const where = historyWhere(userId, now);
  const total = await prisma.booking.count({ where });
  return paginate(total, page, async (window) => {
    const rows = await prisma.booking.findMany({
      where,
      include: historyInclude,
      orderBy: [{ instance: { startAt: "desc" } }, { createdAt: "desc" }],
      skip: window.skip,
      take: window.take,
    });
    return rows.map((row) =>
      mapHistoryRow(
        row as BookingRow & {
          instance: InstanceRow & {
            coach: { id: string; firstName: string; lastName: string; profileImage: { updatedAt: Date } | null } | null;
          };
        },
        now,
      ),
    );
  });
}
