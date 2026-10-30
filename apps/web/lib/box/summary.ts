import { localDateString, packBalance, weekStartDate, weeklyQuotaAdjustmentTotal, weeklyUsed } from "@78feet/domain";
import { prisma } from "../db";
import { isoDateFromDb, isoDateToDb } from "./time";
import { listWeeklyQuotaAdjustments } from "./weekly-quota-adjustments";

export type MemberSummary = {
  tariff: {
    name: string;
    kind: "monthly" | "pack";
    priceCents: number;
    weeklyDirected: number;
    weeklyOpen: number;
  } | null;
  quota: {
    directedUsed: number;
    directedLimit: number;
    directedAdjustment: number;
    openUsed: number;
    openLimit: number;
    openAdjustment: number;
    packBalance: number;
  };
  payment: "paid" | "pending" | null;
};

export type OwnProfile = {
  firstName: string;
  lastName: string;
  loginId: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
};

export async function getMemberSummary(userId: string, now = new Date()): Promise<MemberSummary> {
  const today = localDateString(now);
  const membership = await prisma.membership.findFirst({
    where: { userId, endedAt: null },
    include: { tariff: true },
  });
  const grants = await prisma.creditGrant.findMany({
    where: { userId },
    select: { userId: true, quantity: true },
  });
  const bookings = await prisma.booking.findMany({
    where: { userId, OR: [{ status: "active" }, { quotaReturned: false }] },
    include: { instance: { select: { id: true, date: true } } },
  });
  const instancesById = new Map(
    bookings.map((booking) => [
      booking.instanceId,
      { date: isoDateFromDb(booking.instance.date) },
    ]),
  );
  const domainBookings = bookings.map((booking) => ({
    id: booking.id,
    instanceId: booking.instanceId,
    userId: booking.userId,
    pool: booking.pool,
    status: booking.status,
    quotaReturned: booking.quotaReturned,
    createdBy: booking.createdBy,
    cancelledAt: booking.cancelledAt,
    cancelledBy: booking.cancelledBy,
  }));
  const tariff = membership?.tariff ?? null;
  const weekStart = weekStartDate(today);
  const adjustments = await listWeeklyQuotaAdjustments(prisma, userId, isoDateToDb(weekStart));
  const directedAdjustment = weeklyQuotaAdjustmentTotal(adjustments, "directed");
  const openAdjustment = weeklyQuotaAdjustmentTotal(adjustments, "open");
  const quota = {
    directedUsed: weeklyUsed({
      bookings: domainBookings,
      instancesById,
      userId,
      weekDate: today,
      kind: "directed",
    }),
    directedLimit: tariff?.weeklyDirected ?? 0,
    directedAdjustment,
    openUsed: weeklyUsed({
      bookings: domainBookings,
      instancesById,
      userId,
      weekDate: today,
      kind: "open",
    }),
    openLimit: tariff?.weeklyOpen ?? 0,
    openAdjustment,
    packBalance: packBalance({ grants, bookings: domainBookings, userId }),
  };

  if (!tariff || tariff.kind !== "monthly") {
    return {
      tariff: tariff
        ? {
            name: tariff.name,
            kind: tariff.kind,
            priceCents: tariff.priceCents,
            weeklyDirected: tariff.weeklyDirected,
            weeklyOpen: tariff.weeklyOpen,
          }
        : null,
      quota,
      payment: null,
    };
  }

  const monthStart = `${today.slice(0, 7)}-01`;
  const payment = await prisma.payment.findFirst({
    where: { userId, kind: "monthly", month: isoDateToDb(monthStart) },
    select: { id: true },
  });
  return {
    tariff: {
      name: tariff.name,
      kind: tariff.kind,
      priceCents: tariff.priceCents,
      weeklyDirected: tariff.weeklyDirected,
      weeklyOpen: tariff.weeklyOpen,
    },
    quota,
    payment: payment ? "paid" : "pending",
  };
}

export async function getOwnProfile(userId: string): Promise<OwnProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "member") return null;
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    loginId: user.loginId,
    dni: user.dni,
    phone: user.phone,
    email: user.email,
  };
}
