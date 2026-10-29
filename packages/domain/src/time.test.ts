import { describe, expect, it } from "vitest";
import {
  BOX_TIME_ZONE,
  atBoxTime,
  horizonRange,
  localDateString,
  memberCanCancel,
  nextMondayDate,
  weekEnd,
  weekEndDate,
  weekStart,
  weekStartDate,
  weekdayMonday1,
  zonedParts,
} from "./time";

describe("Europe/Madrid calendar", () => {
  it("treats 2026-10-29 as Thursday and its week as Monday–Sunday", () => {
    expect(weekdayMonday1("2026-10-29")).toBe(4);
    expect(weekStartDate("2026-10-29")).toBe("2026-10-26");
    expect(weekEndDate("2026-10-29")).toBe("2026-11-01");
  });

  it("places week bounds at Monday 00:00 and Sunday 23:59:59.999 in Madrid", () => {
    const start = weekStart("2026-10-29");
    const end = weekEnd("2026-10-29");
    expect(localDateString(start)).toBe("2026-10-26");
    expect(zonedParts(start)).toMatchObject({ hour: 0, minute: 0, second: 0 });
    expect(localDateString(end)).toBe("2026-11-01");
    expect(end.getTime() - atBoxTime("2026-11-01", "23:59:59").getTime()).toBe(999);
    expect(start.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });

  it("never applies a template change to the current week, even on Monday", () => {
    expect(nextMondayDate("2026-10-26")).toBe("2026-11-02");
    expect(nextMondayDate("2026-10-29")).toBe("2026-11-02");
    expect(nextMondayDate("2026-11-01")).toBe("2026-11-02");
  });

  it("opens the current Monday–Sunday week and the next three, through that Sunday", () => {
    expect(horizonRange("2026-10-29")).toEqual({ from: "2026-10-29", to: "2026-11-22" });
    expect(horizonRange("2026-10-26")).toEqual({ from: "2026-10-26", to: "2026-11-22" });
    expect(horizonRange("2026-11-01")).toEqual({ from: "2026-11-01", to: "2026-11-22" });
  });

  it("converts a class time after the spring DST jump", () => {
    const start = atBoxTime("2026-03-30", "07:00");
    const parts = zonedParts(start);
    expect(parts).toMatchObject({
      year: 2026,
      month: 3,
      day: 30,
      hour: 7,
      minute: 0,
    });
    expect(start.toISOString()).toBe("2026-03-30T05:00:00.000Z");
  });
});

describe("member cancellation window", () => {
  const startAt = atBoxTime("2026-10-29", "12:00");

  it("stays open at exactly two hours before start", () => {
    expect(memberCanCancel(atBoxTime("2026-10-29", "10:00"), startAt)).toBe(true);
  });

  it("closes after the two-hour mark", () => {
    const justAfter = new Date(atBoxTime("2026-10-29", "10:00").getTime() + 1);
    expect(memberCanCancel(justAfter, startAt)).toBe(false);
  });
});

describe("timezone constant", () => {
  it("is Europe/Madrid", () => {
    expect(BOX_TIME_ZONE).toBe("Europe/Madrid");
  });
});
