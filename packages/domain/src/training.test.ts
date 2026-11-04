import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import { atBoxTime } from "./time";
import {
  TRAINING_NAME_TAKEN,
  assertDirectedClassType,
  assertTrainingContent,
  datedTrainingName,
  requireDetachConfirm,
  resolveTrainingName,
  uniqueDatedTrainingName,
} from "./training";

describe("training content", () => {
  it("rejects an empty list of phases", () => {
    expect(() => assertTrainingContent([])).toThrow(DomainError);
  });

  it("rejects a phase without blocks or a blank block", () => {
    expect(() => assertTrainingContent([{ name: "Warmup", blocks: [] }])).toThrow(DomainError);
    expect(() => assertTrainingContent([{ name: "Warmup", blocks: [{ body: "  " }] }])).toThrow(DomainError);
  });

  it("accepts phases with plain-text blocks", () => {
    expect(() =>
      assertTrainingContent([
        { name: "Warmup", blocks: [{ body: "3 rounds\n10 air squats" }] },
        { name: "WOD", blocks: [{ body: "AMRAP 12" }] },
      ]),
    ).not.toThrow();
  });

  it("rejects trainings on an open type", () => {
    expect(() => assertDirectedClassType("open")).toThrow(DomainError);
  });
});

describe("training names", () => {
  it("uses the Madrid date when the name is empty and suffixes if that date is taken", () => {
    const at = atBoxTime("2026-11-03", "12:00");
    expect(datedTrainingName(at)).toBe("3 nov 2026");
    expect(resolveTrainingName("  ", [], at)).toBe("3 nov 2026");
    expect(uniqueDatedTrainingName(["3 nov 2026", "3 nov 2026 · 2"], at)).toBe("3 nov 2026 · 3");
    expect(uniqueDatedTrainingName(["3 NOV 2026"], at)).toBe("3 nov 2026 · 2");
  });

  it("rejects a typed name that matches another ignoring case and extra spaces", () => {
    expect(() => resolveTrainingName("  WOD  extra ", ["wod extra"], atBoxTime("2026-11-03", "12:00"))).toThrow(
      DomainError,
    );
    try {
      resolveTrainingName("WOD extra", ["wod extra"], atBoxTime("2026-11-03", "12:00"));
    } catch (error) {
      expect((error as DomainError).message).toBe(TRAINING_NAME_TAKEN);
    }
    expect(resolveTrainingName("  Fuerza  ", ["WOD"], atBoxTime("2026-11-03", "12:00"))).toBe("Fuerza");
  });
});

describe("detach confirmation", () => {
  it("lets a change through when nothing would detach", () => {
    expect(() => requireDetachConfirm(0, false)).not.toThrow();
  });

  it("asks for confirmation and reports how many classes lose the plan", () => {
    try {
      requireDetachConfirm(3, false);
      throw new Error("expected CONFIRM_REQUIRED");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe("CONFIRM_REQUIRED");
      expect((error as DomainError).details).toEqual({ detachCount: 3 });
    }
  });

  it("proceeds when the staff confirms", () => {
    expect(() => requireDetachConfirm(3, true)).not.toThrow();
  });
});
