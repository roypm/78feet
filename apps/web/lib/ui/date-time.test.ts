import { describe, expect, it } from "vitest";
import { dateFromValue, dateToValue, formatDateValue, parseDateInput, parseTimeInput } from "./date-time";

describe("date picker values", () => {
  it("accepts Spanish dates and numeric keyboard input while rejecting impossible days", () => {
    expect(parseDateInput("29/2/2028")).toBe("2028-02-29");
    expect(parseDateInput("29022028")).toBe("2028-02-29");
    for (const value of ["29/02/2026", "31/04/2026", "00/11/2026", "10/13/2026", "29/02/1900", "1/1/0000", "31/", "2026-10-31"]) {
      expect(parseDateInput(value)).toBeUndefined();
    }
    expect(parseDateInput("29/02/2000")).toBe("2000-02-29");
  });

  it("round trips local calendar days across DST boundaries and year changes", () => {
    for (const value of ["2026-03-29", "2026-10-25", "2026-12-31", "2027-01-01", "2028-02-29"]) {
      expect(dateToValue(dateFromValue(value)!)).toBe(value);
      expect(parseDateInput(formatDateValue(value))).toBe(value);
    }
    expect(dateFromValue("2026-02-31")).toBeUndefined();
    expect(formatDateValue("")).toBe("");
  });
});

describe("time picker values", () => {
  it("preserves every minute and accepts entry without a colon", () => {
    expect(parseTimeInput("9:07")).toBe("09:07");
    expect(parseTimeInput("907")).toBe("09:07");
    expect(parseTimeInput("0000")).toBe("00:00");
    expect(parseTimeInput("2359")).toBe("23:59");
    for (let minute = 0; minute < 60; minute++) {
      const value = `18:${String(minute).padStart(2, "0")}`;
      expect(parseTimeInput(value)).toBe(value);
    }
  });

  it("rejects out-of-range, partial and second-level inputs", () => {
    for (const value of ["24:00", "25:12", "12:60", "-1:00", "9:", "9", "12:30:00", "", "abcd"]) {
      expect(parseTimeInput(value)).toBeUndefined();
    }
  });
});
