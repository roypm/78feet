import { DomainError } from "./errors";
import { dateInMonth, dateInWeek } from "./time";
import type {
  Booking,
  BookingPool,
  ClassInstance,
  ClassKind,
  CreditGrant,
  QuotaLimit,
  QuotaPeriod,
  TariffConsumption,
  TariffBilling,
  PaymentBilling,
} from "./types";
import { usesPeriodicQuota } from "./billing-period";

export function bookingCountsTowardQuota(booking: Pick<Booking, "status" | "quotaReturned">): boolean {
  return booking.status === "active" || booking.quotaReturned === false;
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

export function isUnlimitedQuota(limit: QuotaLimit): limit is null {
  return limit === null;
}

export function quotaHasRoom(used: number, limit: QuotaLimit, adjustment = 0): boolean {
  if (limit === null) return true;
  return used < limit + adjustment;
}

export function assignPool(params: {
  consumptionModel: TariffConsumption;
  classKind: ClassKind;
  quotaDirected: QuotaLimit;
  quotaOpen: QuotaLimit;
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

  const used = params.classKind === "directed" ? params.usedDirected : params.usedOpen;
  const limit = params.classKind === "directed" ? params.quotaDirected : params.quotaOpen;
  const adjustment = params.classKind === "directed" ? (params.directedAdjustment ?? 0) : (params.openAdjustment ?? 0);
  if (quotaHasRoom(used, limit, adjustment)) {
    return params.classKind === "directed" ? "quota_directed" : "quota_open";
  }
  if (params.packBalance > 0) {
    return "pack";
  }
  throw new DomainError("QUOTA_EXHAUSTED");
}
