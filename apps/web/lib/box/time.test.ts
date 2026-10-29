import { describe, expect, it } from "vitest";
import { clockFromDb, clockToDb, isoDateFromDb, isoDateToDb, normalizeClock } from "./time";

describe("box clock mapping", () => {
  it("round-trips a local clock through a Postgres time", () => {
    expect(normalizeClock("18:05")).toBe("18:05:00");
    expect(clockFromDb(clockToDb("18:05"))).toBe("18:05:00");
  });

  it("round-trips a calendar date through a Postgres date", () => {
    expect(isoDateFromDb(isoDateToDb("2026-10-29"))).toBe("2026-10-29");
  });
});
