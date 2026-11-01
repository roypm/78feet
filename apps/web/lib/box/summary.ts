import {
  billingPeriodKindLabel,
  isSubscriptionBilling,
  localDateString,
  packBalance,
  periodStartForDate,
  quotaAdjustmentTotal,
  quotaPeriodEndDate,
  quotaPeriodForConsumption,
  quotaPeriodStartDate,
  quotaUsed,
  subscriptionPeriodLabel,
} from "@78feet/domain";
import { prisma } from "../db";
import { isoDateFromDb, isoDateToDb } from "./time";
import { formatMonth, formatWeekRange } from "./format";
import { listQuotaAdjustments } from "./quota-adjustments";
import { profileImageUrl } from "./profile-images";

export type MemberSummary = {
  tariff: {
    name: string;
    consumptionModel: import("@78feet/domain").TariffConsumption;
    billingPeriod: import("@78feet/domain").TariffBilling;
    priceCents: number;
    quotaDirected: number;
    quotaOpen: number;
  } | null;
  quota: {
    period: import("@78feet/domain").QuotaPeriod | null;
    periodStart: string | null;
    periodEnd: string | null;
    periodLabel: string | null;
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
  profileImageUrl: string | null;
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
  const period = tariff ? quotaPeriodForConsumption(tariff.consumptionModel) : null;
  const quotaStart = period ? quotaPeriodStartDate(today, period) : null;
  const periodEnd = period ? quotaPeriodEndDate(today, period) : null;
  const adjustments = period && quotaStart
    ? await listQuotaAdjustments(prisma, userId, period, isoDateToDb(quotaStart))
    : [];
  const directedAdjustment = quotaAdjustmentTotal(adjustments, "directed");
  const openAdjustment = quotaAdjustmentTotal(adjustments, "open");
  const quota = {
    period,
    periodStart: quotaStart,
    periodEnd,
    periodLabel: period === "month" && quotaStart
      ? formatMonth(quotaStart.slice(0, 7))
      : period === "week" && quotaStart && periodEnd
        ? formatWeekRange(quotaStart, periodEnd)
        : null,
    directedUsed: period ? quotaUsed({
      bookings: domainBookings,
      instancesById,
      userId,
      periodDate: today,
      period,
      kind: "directed",
    }) : 0,
    directedLimit: tariff?.quotaDirected ?? 0,
    directedAdjustment,
    openUsed: period ? quotaUsed({
      bookings: domainBookings,
      instancesById,
      userId,
      periodDate: today,
      period,
      kind: "open",
    }) : 0,
    openLimit: tariff?.quotaOpen ?? 0,
    openAdjustment,
    packBalance: packBalance({ grants, bookings: domainBookings, userId }),
  };

  const tariffView = tariff
    ? {
        name: tariff.name,
        consumptionModel: tariff.consumptionModel,
        billingPeriod: tariff.billingPeriod,
        priceCents: tariff.priceCents,
        quotaDirected: tariff.quotaDirected,
        quotaOpen: tariff.quotaOpen,
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      loginId: true,
      dni: true,
      phone: true,
      email: true,
      profileImage: { select: { updatedAt: true } },
    },
  });
  if (!user || user.role !== "member") return null;
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    loginId: user.loginId,
    dni: user.dni,
    phone: user.phone,
    email: user.email,
    profileImageUrl: profileImageUrl(user.id, user.profileImage?.updatedAt),
  };
}
