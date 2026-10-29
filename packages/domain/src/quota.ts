import { DomainError } from "./errors";
import { dateInWeek } from "./time";
import type {
  Booking,
  BookingPool,
  ClassInstance,
  ClassKind,
  CreditGrant,
  TariffKind,
} from "./types";

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
  const pool: BookingPool = params.kind === "directed" ? "weekly_directed" : "weekly_open";
  let used = 0;
  for (const booking of params.bookings) {
    if (booking.userId !== params.userId) continue;
    if (booking.pool !== pool) continue;
    if (!bookingCountsTowardQuota(booking)) continue;
    const instance = params.instancesById.get(booking.instanceId);
    if (!instance) continue;
    if (dateInWeek(instance.date, params.weekDate)) used += 1;
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

export function assignPool(params: {
  tariffKind: TariffKind;
  classKind: ClassKind;
  weeklyDirectedLimit: number;
  weeklyOpenLimit: number;
  weeklyUsedDirected: number;
  weeklyUsedOpen: number;
  packBalance: number;
}): BookingPool {
  if (params.tariffKind === "pack") {
    if (params.packBalance <= 0) {
      throw new DomainError("QUOTA_EXHAUSTED");
    }
    return "pack";
  }

  const used = params.classKind === "directed" ? params.weeklyUsedDirected : params.weeklyUsedOpen;
  const limit = params.classKind === "directed" ? params.weeklyDirectedLimit : params.weeklyOpenLimit;
  if (used < limit) {
    return params.classKind === "directed" ? "weekly_directed" : "weekly_open";
  }
  if (params.packBalance > 0) {
    return "pack";
  }
  throw new DomainError("QUOTA_EXHAUSTED");
}
