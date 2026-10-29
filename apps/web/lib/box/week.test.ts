import { atBoxTime } from "@78feet/domain";
import { describe, expect, it } from "vitest";
import { memberWeek } from "./week";

describe("member week selector", () => {
  it("lists the current week and the next three, each Monday through Sunday", () => {
    const week = memberWeek(atBoxTime("2026-10-29", "12:00"), undefined);
    expect(week.weeks).toEqual([
      { start: "2026-10-26", end: "2026-11-01" },
      { start: "2026-11-02", end: "2026-11-08" },
      { start: "2026-11-09", end: "2026-11-15" },
      { start: "2026-11-16", end: "2026-11-22" },
    ]);
    expect(week.canPrev).toBe(false);
    expect(week.canNext).toBe(true);
    expect(week.next).toBe("2026-11-02");
  });

  it("keeps four full weeks when today is Monday", () => {
    const week = memberWeek(atBoxTime("2026-10-26", "12:00"), undefined);
    expect(week.weeks).toHaveLength(4);
    expect(week.weeks.at(-1)).toEqual({ start: "2026-11-16", end: "2026-11-22" });
  });

  it("stops siguiente on the fourth week and clamps a later request", () => {
    const week = memberWeek(atBoxTime("2026-10-29", "12:00"), "2026-11-23");
    expect(week.start).toBe("2026-11-16");
    expect(week.end).toBe("2026-11-22");
    expect(week.canNext).toBe(false);
    expect(week.canPrev).toBe(true);
    expect(week.prev).toBe("2026-11-09");
  });
});
