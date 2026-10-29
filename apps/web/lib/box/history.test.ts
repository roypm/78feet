import { describe, expect, it } from "vitest";
import { formatMonth } from "./format";
import { groupHistoryByMonth } from "./history";

function item(date: string, startAt: string) {
  return { instance: { date, startAt } };
}

describe("groupHistoryByMonth", () => {
  it("agrupa por mes y deja el más reciente primero", () => {
    const groups = groupHistoryByMonth([
      item("2026-09-15", "2026-09-15T08:00:00.000Z"),
      item("2026-10-02", "2026-10-02T08:00:00.000Z"),
      item("2026-10-29", "2026-10-29T16:00:00.000Z"),
    ]);

    expect(groups.map((group) => group.month)).toEqual(["2026-10", "2026-09"]);
    expect(groups[0]?.items.map((row) => row.instance.date)).toEqual(["2026-10-29", "2026-10-02"]);
  });

  it("devuelve una lista vacía si no hay reservas", () => {
    expect(groupHistoryByMonth([])).toEqual([]);
  });
});

describe("formatMonth", () => {
  it("nombra el mes en español", () => {
    expect(formatMonth("2026-10")).toBe("Octubre de 2026");
  });
});
