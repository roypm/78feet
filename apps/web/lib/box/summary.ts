import {
  billingPeriodKindLabel,
  isSubscriptionBilling,
  localDateString,
  periodStartForDate,
  quotaAdjustmentTotal,
  quotaPeriodEndDate,
  quotaPeriodForConsumption,
  quotaPeriodStartDate,
  subscriptionPeriodLabel,
} from "@78feet/domain";
import { memberConsumption } from "./consumption";
import { prisma } from "../db";
import { isoDateToDb } from "./time";
import { formatMonth, formatWeekRange } from "./format";
import { listQuotaAdjustments } from "./quota-adjustments";
import { profileImageUrl } from "./profile-images";

export type MemberSummary = {
  tariff: {
    name: string;
    consumptionModel: import("@78feet/domain").TariffConsumption;
    billingPeriod: import("@78feet/domain").TariffBilling;
    priceCents: number;
    quotaDirected: number | null;
    quotaOpen: number | null;
  } | null;
  quota: {
    period: import("@78feet/domain").QuotaPeriod | null;
    periodStart: string | null;
    periodEnd: string | null;
    periodLabel: string | null;
    directedUsed: number;
    directedLimit: number | null;
    directedAdjustment: number;
    openUsed: number;
    openLimit: number | null;
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
  const tariff = membership?.tariff ?? null;
  const period = tariff ? quotaPeriodForConsumption(tariff.consumptionModel) : null;
  const quotaStart = period ? quotaPeriodStartDate(today, period) : null;
  const periodEnd = period ? quotaPeriodEndDate(today, period) : null;
  const adjustments =
    period && quotaStart ? await listQuotaAdjustments(prisma, userId, period, isoDateToDb(quotaStart)) : [];
  const directedAdjustment = quotaAdjustmentTotal(adjustments, "directed");
  const openAdjustment = quotaAdjustmentTotal(adjustments, "open");
  const consumption = await memberConsumption(prisma, userId, today, period);
  const quota = {
    period,
    periodStart: quotaStart,
    periodEnd,
    periodLabel:
      period === "month" && quotaStart
        ? formatMonth(quotaStart.slice(0, 7))
        : period === "week" && quotaStart && periodEnd
          ? formatWeekRange(quotaStart, periodEnd)
          : null,
    directedUsed: consumption.usedDirected,
    directedLimit: tariff?.quotaDirected ?? null,
    directedAdjustment,
    openUsed: consumption.usedOpen,
    openLimit: tariff?.quotaOpen ?? null,
    openAdjustment,
    packBalance: consumption.packBalance,
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
