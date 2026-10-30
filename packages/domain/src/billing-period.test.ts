import { describe, expect, it } from "vitest";
import { consumptionModelLabel, periodStartForDate, subscriptionPeriodLabel } from "./billing-period";

describe("periodStartForDate", () => {
  it("uses calendar month, quarter, semester and year", () => {
    expect(periodStartForDate("2026-10-15", "monthly")).toBe("2026-10-01");
    expect(periodStartForDate("2026-10-15", "quarterly")).toBe("2026-10-01");
    expect(periodStartForDate("2026-05-02", "quarterly")).toBe("2026-04-01");
    expect(periodStartForDate("2026-08-01", "semiannual")).toBe("2026-07-01");
    expect(periodStartForDate("2026-03-20", "semiannual")).toBe("2026-01-01");
    expect(periodStartForDate("2026-12-31", "annual")).toBe("2026-01-01");
  });
});

describe("consumptionModelLabel", () => {
  it("labels consumption separately from billing", () => {
    expect(consumptionModelLabel("weekly_quota")).toBe("Cupo semanal");
    expect(consumptionModelLabel("monthly_quota")).toBe("Cupo mensual");
    expect(consumptionModelLabel("pack")).toBe("Bono");
  });
});

describe("subscriptionPeriodLabel", () => {
  it("labels the current subscription period", () => {
    expect(subscriptionPeriodLabel("monthly", "2026-10-01")).toContain("oct");
    expect(subscriptionPeriodLabel("quarterly", "2026-10-01")).toContain("oct–dic");
    expect(subscriptionPeriodLabel("semiannual", "2026-07-01")).toContain("jul–dic");
    expect(subscriptionPeriodLabel("annual", "2026-01-01")).toContain("2026");
  });
});
