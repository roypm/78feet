import { describe, expect, it } from "vitest";
import { defaultBoxHours } from "@78feet/domain";
import { copyWeeklyHours } from "./hours-draft";

describe("copy weekly hours", () => {
  it("replaces selected days with independent copies of all draft intervals, preserving other days and exceptions", () => {
    const config = defaultBoxHours();
    config.weekly[0].intervals = [
      { openTime: "08:00", closeTime: "12:00" },
      { openTime: "16:00", closeTime: "20:00" },
    ];
    config.exceptions = [{ date: "2026-12-25", intervals: [] }];
    const result = copyWeeklyHours(config, 1, [2, 3]);
    expect(result.weekly[1].intervals).toEqual(config.weekly[0].intervals);
    expect(result.weekly[2].intervals).toEqual(config.weekly[0].intervals);
    expect(result.weekly[3]).toBe(config.weekly[3]);
    expect(result.exceptions).toBe(config.exceptions);
    result.weekly[1].intervals[0].openTime = "09:00";
    expect(result.weekly[2].intervals[0].openTime).toBe("08:00");
    expect(config.weekly[0].intervals[0].openTime).toBe("08:00");
    expect(config.weekly[1].intervals[0].openTime).toBe("07:00");
  });

  it("copies a closed day and leaves the draft unchanged when no destinations are selected", () => {
    const config = defaultBoxHours();
    config.weekly[0].intervals = [];
    expect(copyWeeklyHours(config, 1, [2, 7]).weekly.filter((day) => [1, 2, 7].includes(day.weekday))
      .every((day) => day.intervals.length === 0)).toBe(true);
    expect(copyWeeklyHours(config, 1, [])).toEqual(config);
  });
});
