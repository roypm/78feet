import {
  billingPeriodKindLabel,
  isSubscriptionBilling,
  localDateString,
  packBalance,
  periodStartForDate,
  subscriptionPeriodLabel,
  weekStartDate,
  weeklyQuotaAdjustmentTotal,
  weeklyUsed,
} from "@78feet/domain";
import { prisma } from "../db";
import { isoDateFromDb, isoDateToDb } from "./time";
import { listWeeklyQuotaAdjustments } from "./weekly-quota-adjustments";

export type MemberSummary = {
  tariff: {
    name: string;
    consumptionModel: import("@78feet/domain").TariffConsumption;
    billingPeriod: import("@78feet/domain").TariffBilling;
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
  payment: {
    status: "paid" | "pending";
    billingPeriod: "monthly" | "quarterly" | "semiannual" | "annual";
    periodStart: string;
    periodLabel: string;
  } | null;
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

  const tariffView = tariff
    ? {
        name: tariff.name,
        consumptionModel: tariff.consumptionModel,
        billingPeriod: tariff.billingPeriod,
        priceCents: tariff.priceCents,
        weeklyDirected: tariff.weeklyDirected,
        weeklyOpen: tariff.weeklyOpen,
      }
    : null;

  if (!tariff || !isSubscriptionBilling(tariff.billingPeriod)) {
    return { tariff: tariffView, quota, payment: null };
  }

  const periodStart = periodStartForDate(today, tariff.billingPeriod);
  const payment = await prisma.payment.findFirst({
    where: {
      userId,
      billingPeriod: tariff.billingPeriod,
      periodStart: isoDateToDb(periodStart),
    },
    select: { id: true },
  });

  return {
    tariff: tariffView,
    quota,
    payment: {
      status: payment ? "paid" : "pending",
      billingPeriod: tariff.billingPeriod,
      periodStart,
      periodLabel: subscriptionPeriodLabel(tariff.billingPeriod, periodStart),
    },
  };
}

export { billingPeriodKindLabel };

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
