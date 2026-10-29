import { beforeEach, describe, expect, it } from "vitest";
import { atBoxTime } from "./time";
import { DomainError, type ErrorCode } from "./errors";
import {
  cancelInstanceBookings,
  evaluateBooking,
  evaluateMemberCancellation,
  evaluateStaffCancellation,
} from "./booking";
import { packBalance, weeklyUsed } from "./quota";
import {
  instanceMap,
  makeBooking,
  makeGrant,
  makeInstance,
  resetIds,
} from "./test/fixtures";
import type { MembershipSnapshot, TariffSnapshot } from "./types";

function expectCode(run: () => unknown, code: ErrorCode): void {
  try {
    run();
    throw new Error(`expected DomainError ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
  }
}

const userId = "member-1";
const monthly: TariffSnapshot = {
  id: "tariff-monthly",
  kind: "monthly",
  weeklyDirected: 2,
  weeklyOpen: 2,
};
const membership: MembershipSnapshot = {
  userId,
  tariffId: monthly.id,
  endedAt: null,
};

beforeEach(() => {
  resetIds();
});

describe("evaluateBooking", () => {
  it("assigns weekly_directed while the weekly limit has room", () => {
    const instance = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    const result = evaluateBooking({
      now: atBoxTime("2026-10-26", "09:00"),
      instance,
      membership,
      tariff: monthly,
      userId,
      bookings: [],
      instancesById: instanceMap([instance]),
      grants: [],
    });
    expect(result.pool).toBe("weekly_directed");
  });

  it("rejects a class that already started", () => {
    const instance = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    expectCode(
      () =>
        evaluateBooking({
          now: instance.startAt,
          instance,
          membership,
          tariff: monthly,
          userId,
          bookings: [],
          instancesById: instanceMap([instance]),
          grants: [],
        }),
      "FORBIDDEN",
    );
  });

  it("rejects without a current membership", () => {
    const instance = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    expectCode(
      () =>
        evaluateBooking({
          now: atBoxTime("2026-10-26", "09:00"),
          instance,
          membership: null,
          tariff: monthly,
          userId,
          bookings: [],
          instancesById: instanceMap([instance]),
          grants: [],
        }),
      "NO_MEMBERSHIP",
    );
  });

  it("rejects an overlapping active booking", () => {
    const first = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    const second = makeInstance({
      date: "2026-10-27",
      kind: "open",
      title: "Open",
      templateId: "tpl-open",
      startAt: atBoxTime("2026-10-27", "18:30"),
      endAt: atBoxTime("2026-10-27", "19:30"),
    });
    const bookings = [makeBooking({ instanceId: first.id, userId, pool: "weekly_directed" })];
    expectCode(
      () =>
        evaluateBooking({
          now: atBoxTime("2026-10-26", "09:00"),
          instance: second,
          membership,
          tariff: monthly,
          userId,
          bookings,
          instancesById: instanceMap([first, second]),
          grants: [],
        }),
      "OVERLAP",
    );
  });

  it("allows back-to-back classes that only touch at the boundary", () => {
    const first = makeInstance({
      date: "2026-10-27",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-10-27", "18:00"),
      endAt: atBoxTime("2026-10-27", "19:00"),
    });
    const second = makeInstance({
      date: "2026-10-27",
      kind: "open",
      title: "Open",
      templateId: "tpl-open",
      startAt: atBoxTime("2026-10-27", "19:00"),
      endAt: atBoxTime("2026-10-27", "20:00"),
    });
    const bookings = [makeBooking({ instanceId: first.id, userId, pool: "weekly_directed" })];
    const result = evaluateBooking({
      now: atBoxTime("2026-10-26", "09:00"),
      instance: second,
      membership,
      tariff: monthly,
      userId,
      bookings,
      instancesById: instanceMap([first, second]),
      grants: [],
    });
    expect(result.pool).toBe("weekly_open");
  });

  it("rejects a full class", () => {
    const instance = makeInstance({
      date: "2026-10-27",
      kind: "directed",
      title: "WOD",
      capacity: 1,
    });
    const bookings = [makeBooking({ instanceId: instance.id, userId: "other", pool: "weekly_directed" })];
    expectCode(
      () =>
        evaluateBooking({
          now: atBoxTime("2026-10-26", "09:00"),
          instance,
          membership,
          tariff: monthly,
          userId,
          bookings,
          instancesById: instanceMap([instance]),
          grants: [],
        }),
      "FULL",
    );
  });
});

describe("cancellation", () => {
  it("returns quota for a member inside the window", () => {
    const startAt = atBoxTime("2026-10-29", "18:00");
    expect(evaluateMemberCancellation(atBoxTime("2026-10-29", "16:00"), startAt)).toEqual({
      quotaReturned: true,
    });
  });

  it("blocks a member inside the last two hours", () => {
    const startAt = atBoxTime("2026-10-29", "18:00");
    try {
      evaluateMemberCancellation(atBoxTime("2026-10-29", "16:00:01"), startAt);
      throw new Error("expected DomainError");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe("CANCELLATION_CLOSED");
    }
  });

  it("lets staff keep or return quota", () => {
    expect(evaluateStaffCancellation()).toEqual({ quotaReturned: true });
    expect(evaluateStaffCancellation(false)).toEqual({ quotaReturned: false });
  });

  it("returns every booking when the box cancels the class", () => {
    const instance = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    const bookings = [
      makeBooking({ instanceId: instance.id, userId: "a", pool: "weekly_directed" }),
      makeBooking({ instanceId: instance.id, userId: "b", pool: "pack" }),
      makeBooking({
        instanceId: instance.id,
        userId: "c",
        pool: "weekly_directed",
        status: "cancelled",
        quotaReturned: false,
      }),
    ];
    const next = cancelInstanceBookings(bookings, instance.id, atBoxTime("2026-10-26", "09:00"), "admin-1");
    expect(next.filter((booking) => booking.status === "active")).toHaveLength(0);
    expect(next[0]?.quotaReturned).toBe(true);
    expect(next[1]?.quotaReturned).toBe(true);
    expect(next[2]?.quotaReturned).toBe(false);

    expect(
      weeklyUsed({
        bookings: next,
        instancesById: instanceMap([instance]),
        userId: "a",
        weekDate: instance.date,
        kind: "directed",
      }),
    ).toBe(0);
    expect(
      packBalance({
        grants: [makeGrant({ userId: "b", quantity: 5 })],
        bookings: next,
        userId: "b",
      }),
    ).toBe(5);
  });
});
