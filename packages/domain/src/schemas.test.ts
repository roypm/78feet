import { describe, expect, it } from "vitest";
import { tariffWriteSchema, templateWriteSchema } from "./schemas";

describe("tariffWriteSchema", () => {
  it("accepts a monthly tariff without a pack size", () => {
    const parsed = tariffWriteSchema.parse({
      name: "Ilimitada",
      kind: "monthly",
      priceCents: 7000,
      weeklyDirected: 3,
      weeklyOpen: 2,
    });
    expect(parsed).toMatchObject({
      kind: "monthly",
      packClasses: null,
      weeklyDirected: 3,
      weeklyOpen: 2,
      active: true,
    });
  });

  it("rejects a pack without a class count and a monthly with one", () => {
    expect(
      tariffWriteSchema.safeParse({ name: "Bono", kind: "pack", priceCents: 5000 }).success,
    ).toBe(false);
    expect(
      tariffWriteSchema.safeParse({
        name: "Mensual",
        kind: "monthly",
        priceCents: 7000,
        packClasses: 5,
      }).success,
    ).toBe(false);
    expect(
      tariffWriteSchema.safeParse({
        name: "Bono",
        kind: "pack",
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
