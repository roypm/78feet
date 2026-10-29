import { describe, expect, it } from "vitest";
import { templateAxis, templateBlockBox } from "./template-layout";

describe("template layout", () => {
  it("uses the configured box hours and extends them for earlier or later templates", () => {
    const axis = templateAxis(
      [
        { startTime: "06:30", endTime: "07:30" },
        { startTime: "20:30", endTime: "21:45" },
      ],
      { openTime: "07:00", closeTime: "21:00" },
    );

    expect(axis.axisStart).toBe(360);
    expect(axis.axisEnd).toBe(1320);
    expect(axis.hours).toEqual([360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, 1260, 1320]);
    expect(axis.ticks).toHaveLength(65);
  });

  it("positions a block and keeps short classes at least an hour tall", () => {
    expect(templateBlockBox({ startTime: "18:15", endTime: "18:45" }, 420, 72)).toEqual({
      top: 810,
      height: 72,
    });
  });
});
