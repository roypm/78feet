import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import { assignPool, bookingCountsTowardQuota, packBalance, weeklyUsed } from "./quota";
import {
  instanceMap,
  makeBooking,
  makeGrant,
  makeInstance,
  resetIds,
} from "./test/fixtures";

const userId = "member-1";

beforeEach(() => {
  resetIds();
});

describe("weekly quota against the class week", () => {
  it("consumes the week of the class, not the week of the reservation", () => {
    const thisWeek = makeInstance({
      date: "2026-10-27",
      kind: "directed",
      title: "WOD",
    });
    const nextWeek = makeInstance({
      date: "2026-11-02",
      kind: "directed",
      title: "WOD",
    });
    const bookings = [
      makeBooking({
        instanceId: nextWeek.id,
        userId,
        pool: "weekly_directed",
      }),
    ];
    const instancesById = instanceMap([thisWeek, nextWeek]);

    expect(
      weeklyUsed({
        bookings,
        instancesById,
        userId,
        weekDate: "2026-10-27",
        kind: "directed",
      }),
    ).toBe(0);
    expect(
      weeklyUsed({
        bookings,
        instancesById,
        userId,
        weekDate: "2026-11-02",
        kind: "directed",
      }),
    ).toBe(1);
  });

  it("keeps directed and open counters apart", () => {
    const directed = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    const open = makeInstance({
      date: "2026-10-28",
      kind: "open",
      title: "Open",
    });
    const bookings = [
      makeBooking({ instanceId: directed.id, userId, pool: "weekly_directed" }),
      makeBooking({ instanceId: open.id, userId, pool: "weekly_open" }),
    ];
    const instancesById = instanceMap([directed, open]);

    expect(
      weeklyUsed({ bookings, instancesById, userId, weekDate: directed.date, kind: "directed" }),
    ).toBe(1);
    expect(
      weeklyUsed({ bookings, instancesById, userId, weekDate: open.date, kind: "open" }),
    ).toBe(1);
  });
});

describe("pack overflow and returned quota", () => {
  it("does not count a cancelled booking that returned quota", () => {
    const instance = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    const bookings = [
      makeBooking({
        instanceId: instance.id,
        userId,
        pool: "weekly_directed",
        status: "cancelled",
        quotaReturned: true,
      }),
    ];
    expect(bookingCountsTowardQuota(bookings[0]!)).toBe(false);
    expect(
      weeklyUsed({
        bookings,
        instancesById: instanceMap([instance]),
        userId,
        weekDate: instance.date,
        kind: "directed",
      }),
    ).toBe(0);
  });

  it("still counts a staff cancellation that kept the quota", () => {
    const instance = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    const bookings = [
      makeBooking({
        instanceId: instance.id,
        userId,
        pool: "weekly_directed",
        status: "cancelled",
        quotaReturned: false,
      }),
    ];
    expect(bookingCountsTowardQuota(bookings[0]!)).toBe(true);
    expect(
      weeklyUsed({
        bookings,
        instancesById: instanceMap([instance]),
        userId,
        weekDate: instance.date,
        kind: "directed",
      }),
    ).toBe(1);
  });

  it("overflows a monthly member to pack and reduces pack_balance", () => {
    const first = makeInstance({ date: "2026-10-26", kind: "directed", title: "WOD" });
    const second = makeInstance({ date: "2026-10-27", kind: "directed", title: "WOD" });
    const third = makeInstance({ date: "2026-10-28", kind: "directed", title: "WOD" });
    const bookings = [
      makeBooking({ instanceId: first.id, userId, pool: "weekly_directed" }),
      makeBooking({ instanceId: second.id, userId, pool: "weekly_directed" }),
      makeBooking({ instanceId: third.id, userId, pool: "pack" }),
    ];
    const instancesById = instanceMap([first, second, third]);
    const usedDirected = weeklyUsed({
      bookings,
      instancesById,
      userId,
      weekDate: first.date,
      kind: "directed",
    });
    const balance = packBalance({
      grants: [makeGrant({ userId, quantity: 4 })],
      bookings,
      userId,
    });

    expect(usedDirected).toBe(2);
    expect(balance).toBe(3);
    expect(
      assignPool({
        consumptionModel: "weekly_quota",
        classKind: "directed",
        weeklyDirectedLimit: 2,
        weeklyOpenLimit: 2,
        weeklyUsedDirected: usedDirected,
        weeklyUsedOpen: 0,
        packBalance: balance,
      }),
    ).toBe("pack");
  });

  it("exhausts quota when weekly limit and pack are gone", () => {
    expect(() =>
      assignPool({
        consumptionModel: "weekly_quota",
        classKind: "open",
        weeklyDirectedLimit: 2,
        weeklyOpenLimit: 1,
        weeklyUsedDirected: 0,
        weeklyUsedOpen: 1,
        packBalance: 0,
      }),
    ).toThrow(DomainError);
    try {
      assignPool({
        consumptionModel: "weekly_quota",
        classKind: "open",
        weeklyDirectedLimit: 2,
        weeklyOpenLimit: 1,
        weeklyUsedDirected: 0,
        weeklyUsedOpen: 1,
        packBalance: 0,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe("QUOTA_EXHAUSTED");
    }
  });

  it("uses only pack for a pack tariff", () => {
    expect(
      assignPool({
        consumptionModel: "pack",
        classKind: "directed",
        weeklyDirectedLimit: 0,
        weeklyOpenLimit: 0,
        weeklyUsedDirected: 0,
        weeklyUsedOpen: 0,
        packBalance: 1,
      }),
    ).toBe("pack");
  });
});
