import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import { assertDirectedClassType, assertTrainingContent, requireDetachConfirm } from "./training";

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
