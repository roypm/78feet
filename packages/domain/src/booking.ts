import { DomainError } from "./errors";
import { assignPool, packBalance, weeklyUsed } from "./quota";
import { instanceHasStarted, intervalsOverlap, memberCanCancel } from "./time";
import type {
  Booking,
  BookingPool,
  ClassInstance,
  CreditGrant,
  MembershipSnapshot,
  TariffSnapshot,
} from "./types";

export function activeBookingsOnInstance(
  bookings: readonly Booking[],
  instanceId: string,
): Booking[] {
  return bookings.filter(
    (booking) => booking.instanceId === instanceId && booking.status === "active",
  );
}

export function memberHasOverlap(params: {
  candidate: Pick<ClassInstance, "startAt" | "endAt">;
  bookings: readonly Booking[];
  instancesById: ReadonlyMap<string, Pick<ClassInstance, "startAt" | "endAt">>;
  userId: string;
}): boolean {
  for (const booking of params.bookings) {
    if (booking.userId !== params.userId || booking.status !== "active") continue;
    const instance = params.instancesById.get(booking.instanceId);
    if (!instance) continue;
    if (intervalsOverlap(params.candidate.startAt, params.candidate.endAt, instance.startAt, instance.endAt)) {
      return true;
    }
  }
  return false;
}

export function evaluateBooking(params: {
  now: Date;
  instance: ClassInstance;
  membership: MembershipSnapshot | null;
  tariff: TariffSnapshot | null;
  userId: string;
  bookings: readonly Booking[];
  instancesById: ReadonlyMap<string, Pick<ClassInstance, "date" | "startAt" | "endAt">>;
  grants: readonly Pick<CreditGrant, "userId" | "quantity">[];
}): { pool: BookingPool } {
  if (params.instance.status !== "scheduled") {
    throw new DomainError("FORBIDDEN");
  }
  if (instanceHasStarted(params.now, params.instance.startAt)) {
    throw new DomainError("FORBIDDEN");
  }
  if (!params.membership || params.membership.endedAt !== null || !params.tariff) {
    throw new DomainError("NO_MEMBERSHIP");
  }
  if (
    memberHasOverlap({
      candidate: params.instance,
      bookings: params.bookings,
      instancesById: params.instancesById,
      userId: params.userId,
    })
  ) {
    throw new DomainError("OVERLAP");
  }
  if (activeBookingsOnInstance(params.bookings, params.instance.id).length >= params.instance.capacity) {
    throw new DomainError("FULL");
  }

  const pool = assignPool({
    tariffKind: params.tariff.kind,
    classKind: params.instance.kind,
    weeklyDirectedLimit: params.tariff.weeklyDirected,
    weeklyOpenLimit: params.tariff.weeklyOpen,
    weeklyUsedDirected: weeklyUsed({
      bookings: params.bookings,
      instancesById: params.instancesById,
      userId: params.userId,
      weekDate: params.instance.date,
      kind: "directed",
    }),
    weeklyUsedOpen: weeklyUsed({
      bookings: params.bookings,
      instancesById: params.instancesById,
      userId: params.userId,
      weekDate: params.instance.date,
      kind: "open",
    }),
    packBalance: packBalance({
      grants: params.grants,
      bookings: params.bookings,
      userId: params.userId,
    }),
  });

  return { pool };
}

export function evaluateMemberCancellation(now: Date, startAt: Date): { quotaReturned: true } {
  if (!memberCanCancel(now, startAt)) {
    throw new DomainError("CANCELLATION_CLOSED");
  }
  return { quotaReturned: true };
}

export function evaluateStaffCancellation(returnQuota = true): { quotaReturned: boolean } {
  return { quotaReturned: returnQuota };
}

export function applyCancellation(
  booking: Booking,
  quotaReturned: boolean,
  cancelledAt: Date,
  cancelledBy: string,
): Booking {
  return {
    ...booking,
    status: "cancelled",
    quotaReturned,
    cancelledAt,
    cancelledBy,
  };
}

export function cancelInstanceBookings(
  bookings: readonly Booking[],
  instanceId: string,
  cancelledAt: Date,
  cancelledBy: string,
): Booking[] {
  return bookings.map((booking) => {
    if (booking.instanceId !== instanceId || booking.status !== "active") {
      return booking;
    }
    return applyCancellation(booking, true, cancelledAt, cancelledBy);
  });
}
