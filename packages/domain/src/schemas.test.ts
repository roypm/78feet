import { describe, expect, it } from "vitest";
import { tariffWriteSchema, templateWriteSchema } from "./schemas";

describe("tariffWriteSchema", () => {
  it("accepts a weekly-quota tariff with monthly billing", () => {
    const parsed = tariffWriteSchema.parse({
      name: "Ilimitada",
      consumptionModel: "weekly_quota",
      billingPeriod: "monthly",
      priceCents: 7000,
      weeklyDirected: 3,
      weeklyOpen: 2,
    });
    expect(parsed).toMatchObject({
      consumptionModel: "weekly_quota",
      billingPeriod: "monthly",
      packClasses: null,
      weeklyDirected: 3,
      weeklyOpen: 2,
      active: true,
    });
  });

  it("rejects a pack without a class count and a monthly with one", () => {
    expect(
      tariffWriteSchema.safeParse({
        name: "Bono",
        consumptionModel: "pack",
        billingPeriod: "one_time",
        priceCents: 5000,
      }).success,
    ).toBe(false);
    expect(
      tariffWriteSchema.safeParse({
        name: "Mensual",
        consumptionModel: "weekly_quota",
        billingPeriod: "monthly",
        priceCents: 7000,
        packClasses: 5,
      }).success,
    ).toBe(false);
    expect(
      tariffWriteSchema.safeParse({
        name: "Bono",
        consumptionModel: "pack",
        billingPeriod: "one_time",
        priceCents: 5000,
        packClasses: 10,
        weeklyDirected: 1,
      }).success,
    ).toBe(false);
  });
});

describe("templateWriteSchema", () => {
  it("rejects a weekday outside Monday–Sunday", () => {
    expect(
      templateWriteSchema.safeParse({
        weekday: 8,
        startTime: "18:00",
        endTime: "19:00",
        title: "WOD",
        kind: "directed",
        defaultCapacity: 12,
      }).success,
    ).toBe(false);
  });
});
