import { atBoxTime } from "@78feet/domain";
import { describe, expect, it } from "vitest";
import type { CalendarClass } from "./calendar";
import { calendarAxis, clockLabel } from "./calendar-layout";

function klass(start: string, end: string): CalendarClass {
  return {
    id: "1",
    date: "2026-10-29",
    startAt: atBoxTime("2026-10-29", start).toISOString(),
    endAt: atBoxTime("2026-10-29", end).toISOString(),
    name: "Fuerza",
    classTypeId: "type-1",
    imageUrl: "/uploads/class-types/placeholder.png",
    kind: "directed",
    status: "scheduled",
    capacity: 12,
    bookedCount: 0,
    freeSpots: 12,
    coachName: null,
    bookedByMe: false,
  };
}

describe("calendar axis", () => {
  it("opens at 07:00 and closes at 21:00 even when classes sit in the middle", () => {
    const axis = calendarAxis([klass("09:15", "10:15")]);
    expect(clockLabel(axis.axisStart)).toBe("07:00");
    expect(clockLabel(axis.axisEnd)).toBe("21:00");
    expect(axis.hours[0]).toBe(axis.axisStart);
    expect(axis.hours.at(-1)).toBe(axis.axisEnd);
  });

  it("keeps the same window when the week has no classes", () => {
    const axis = calendarAxis([]);
    expect(clockLabel(axis.axisStart)).toBe("07:00");
    expect(clockLabel(axis.axisEnd)).toBe("21:00");
  });

  it("grows past closing when a class ends later", () => {
    const axis = calendarAxis([klass("20:00", "21:30")]);
    expect(clockLabel(axis.axisStart)).toBe("07:00");
    expect(clockLabel(axis.axisEnd)).toBe("22:00");
  });
});
