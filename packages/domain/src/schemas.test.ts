import { describe, expect, it } from "vitest";
import {
  boxHoursConfigSchema,
  boxNameSchema,
  createStaffSchema,
  patchStaffSchema,
  tariffWriteSchema,
  templateWriteSchema,
  trainingPatchSchema,
  trainingWriteSchema,
  type BoxHoursConfig,
} from "./schemas";

function validBoxHours(): BoxHoursConfig {
  return {
    weekly: Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      intervals: [{ openTime: "07:00", closeTime: "12:00" }, { openTime: "13:00", closeTime: "21:00" }],
    })),
    exceptions: [],
  };
}

describe("tariffWriteSchema", () => {
  it("accepts a weekly-quota tariff with monthly billing", () => {
    const parsed = tariffWriteSchema.parse({
      name: "Ilimitada",
      consumptionModel: "weekly_quota",
      billingPeriod: "monthly",
      priceCents: 7000,
      quotaDirected: 3,
      quotaOpen: 2,
    });
    expect(parsed).toMatchObject({
      consumptionModel: "weekly_quota",
      billingPeriod: "monthly",
      packClasses: null,
      quotaDirected: 3,
      quotaOpen: 2,
      active: true,
    });
  });

  it("accepts unlimited periodic quotas and rejects them on a pack", () => {
    const parsed = tariffWriteSchema.parse({
      name: "Ilimitadas dirigidas",
      consumptionModel: "weekly_quota",
      billingPeriod: "monthly",
      priceCents: 9000,
      quotaDirected: null,
      quotaOpen: 0,
    });
    expect(parsed).toMatchObject({ quotaDirected: null, quotaOpen: 0, packClasses: null });
    expect(
      tariffWriteSchema.safeParse({
        name: "Bono",
        consumptionModel: "pack",
        billingPeriod: "one_time",
        priceCents: 5000,
        packClasses: 10,
        quotaDirected: null,
      }).success,
    ).toBe(false);
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
        quotaDirected: 1,
      }).success,
    ).toBe(false);
  });
});

describe("boxNameSchema", () => {
  it("trims the name and rejects an empty or oversized one", () => {
    expect(boxNameSchema.parse("  Box Norte  ")).toBe("Box Norte");
    expect(boxNameSchema.safeParse("   ").success).toBe(false);
    expect(boxNameSchema.safeParse("a".repeat(41)).success).toBe(false);
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

describe("boxHoursConfigSchema", () => {
  it("accepts split opening hours, full-day closures and dated overrides", () => {
    const config = validBoxHours();
    config.weekly[6]!.intervals = [];
    config.exceptions = [{ date: "2026-12-25", intervals: [] }];

    expect(boxHoursConfigSchema.safeParse(config).success).toBe(true);
  });

  it("rejects invalid clocks, reversed or overlapping intervals, and duplicate weekdays", () => {
    const invalidClock = validBoxHours();
    invalidClock.weekly[0]!.intervals[0]!.openTime = "25:00";
    expect(boxHoursConfigSchema.safeParse(invalidClock).success).toBe(false);

    const reversed = validBoxHours();
    reversed.weekly[0]!.intervals[0] = { openTime: "12:00", closeTime: "07:00" };
    expect(boxHoursConfigSchema.safeParse(reversed).success).toBe(false);

    const overlapping = validBoxHours();
    overlapping.weekly[0]!.intervals = [
      { openTime: "07:00", closeTime: "13:00" },
      { openTime: "12:30", closeTime: "21:00" },
    ];
    expect(boxHoursConfigSchema.safeParse(overlapping).success).toBe(false);

    const duplicateWeekday = validBoxHours();
    duplicateWeekday.weekly[6]!.weekday = 6;
    expect(boxHoursConfigSchema.safeParse(duplicateWeekday).success).toBe(false);
  });
});

describe("trainingWriteSchema", () => {
  const classTypeId = "11111111-1111-4111-8111-111111111111";
  const phases = [{ name: "WOD", blocks: [{ body: "AMRAP 12" }] }];

  it("accepts an empty name and still requires at least one phase", () => {
    expect(trainingWriteSchema.safeParse({ name: "", classTypeId, phases }).success).toBe(true);
    expect(trainingWriteSchema.safeParse({ classTypeId, phases }).success).toBe(false);
    expect(trainingWriteSchema.safeParse({ name: "", classTypeId, phases: [] }).success).toBe(false);
  });
});

describe("trainingPatchSchema", () => {
  it("accepts clearing the name so the save can assign the dated one", () => {
    expect(trainingPatchSchema.safeParse({ name: "" }).success).toBe(true);
  });
});

describe("staff schemas", () => {
  it("requires a DNI when creating staff and accepts contact details", () => {
    const staff = {
      loginId: "coach.ana",
      password: "secret-pass",
      firstName: "Ana",
      lastName: "Garcia",
      role: "coach",
      dni: "12345678A",
      phone: "600123123",
      email: "ana@example.test",
    };
    expect(createStaffSchema.safeParse(staff).success).toBe(true);
    expect(createStaffSchema.safeParse({ ...staff, dni: undefined }).success).toBe(false);
    expect(createStaffSchema.safeParse({ ...staff, email: "no-es-email" }).success).toBe(false);
  });

  it("validates optional contact updates", () => {
    expect(patchStaffSchema.safeParse({ phone: null, email: "ana@example.test" }).success).toBe(true);
    expect(patchStaffSchema.safeParse({ email: "no-es-email" }).success).toBe(false);
  });
});
