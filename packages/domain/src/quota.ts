import { DomainError } from "./errors";
import { dateInMonth, dateInWeek } from "./time";
import type {
  Booking,
  BookingPool,
  ClassInstance,
  ClassKind,
  CreditGrant,
  QuotaPeriod,
  TariffConsumption,
  TariffBilling,
  PaymentBilling,
} from "./types";
import { usesPeriodicQuota } from "./billing-period";

export function bookingCountsTowardQuota(booking: Pick<Booking, "status" | "quotaReturned">): boolean {
  return booking.status === "active" || booking.quotaReturned === false;
}

export function weeklyUsed(params: {
  bookings: readonly Booking[];
  instancesById: ReadonlyMap<string, Pick<ClassInstance, "date">>;
  userId: string;
  weekDate: string;
  kind: ClassKind;
}): number {
  return quotaUsed({
    bookings: params.bookings,
    instancesById: params.instancesById,
    userId: params.userId,
    periodDate: params.weekDate,
    period: "week",
    kind: params.kind,
  });
}

export function monthlyUsed(params: {
  bookings: readonly Booking[];
  instancesById: ReadonlyMap<string, Pick<ClassInstance, "date">>;
  userId: string;
  monthDate: string;
  kind: ClassKind;
}): number {
  return quotaUsed({
    bookings: params.bookings,
    instancesById: params.instancesById,
    userId: params.userId,
    periodDate: params.monthDate,
    period: "month",
    kind: params.kind,
  });
}

export function quotaUsed(params: {
  bookings: readonly Booking[];
  instancesById: ReadonlyMap<string, Pick<ClassInstance, "date">>;
  userId: string;
  periodDate: string;
  period: QuotaPeriod;
  kind: ClassKind;
}): number {
  const pool: BookingPool = params.kind === "directed" ? "quota_directed" : "quota_open";
  let used = 0;
  for (const booking of params.bookings) {
    if (booking.userId !== params.userId) continue;
    if (booking.pool !== pool) continue;
    if (!bookingCountsTowardQuota(booking)) continue;
    const instance = params.instancesById.get(booking.instanceId);
    if (!instance) continue;
    const inPeriod = params.period === "week"
      ? dateInWeek(instance.date, params.periodDate)
      : dateInMonth(instance.date, params.periodDate);
    if (inPeriod) used += 1;
  }
  return used;
}

export function packBalance(params: {
  grants: readonly Pick<CreditGrant, "userId" | "quantity">[];
  bookings: readonly Booking[];
  userId: string;
}): number {
  const granted = params.grants
    .filter((grant) => grant.userId === params.userId)
    .reduce((sum, grant) => sum + grant.quantity, 0);
  const consumed = params.bookings.filter(
    (booking) =>
      booking.userId === params.userId &&
      booking.pool === "pack" &&
      bookingCountsTowardQuota(booking),
  ).length;
  return granted - consumed;
}

export function quotaAdjustmentTotal(
  adjustments: readonly { kind: ClassKind; delta: number }[],
  kind: ClassKind,
): number {
  let total = 0;
  for (const adjustment of adjustments) {
    if (adjustment.kind === kind) total += adjustment.delta;
  }
  return total;
}

export function assignPool(params: {
  consumptionModel: TariffConsumption;
  classKind: ClassKind;
  quotaDirected: number;
  quotaOpen: number;
  directedAdjustment?: number;
  openAdjustment?: number;
  usedDirected: number;
  usedOpen: number;
  packBalance: number;
}): BookingPool {
  if (params.consumptionModel === "pack") {
    if (params.packBalance <= 0) {
      throw new DomainError("QUOTA_EXHAUSTED");
    }
    return "pack";
  }

  const directedLimit = params.quotaDirected + (params.directedAdjustment ?? 0);
  const openLimit = params.quotaOpen + (params.openAdjustment ?? 0);
  const used = params.classKind === "directed" ? params.usedDirected : params.usedOpen;
  const limit = params.classKind === "directed" ? directedLimit : openLimit;
  if (used < limit) {
    return params.classKind === "directed" ? "quota_directed" : "quota_open";
  }
  if (params.packBalance > 0) {
    return "pack";
  }
  throw new DomainError("QUOTA_EXHAUSTED");
}
