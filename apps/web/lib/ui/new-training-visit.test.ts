import { describe, expect, it } from "vitest";
import { NEW_TRAINING_PATH, nextNewTrainingVisit } from "./new-training-visit";

describe("nextNewTrainingVisit", () => {
  it("keeps visit 0 on the first landing", () => {
    expect(nextNewTrainingVisit(null, NEW_TRAINING_PATH, 0)).toBe(0);
  });

  it("bumps when entering Nuevo from another biblioteca screen", () => {
    expect(nextNewTrainingVisit("/staff/biblioteca", NEW_TRAINING_PATH, 0)).toBe(1);
    expect(nextNewTrainingVisit(NEW_TRAINING_PATH, "/staff/biblioteca", 1)).toBe(1);
    expect(nextNewTrainingVisit("/staff/biblioteca", NEW_TRAINING_PATH, 1)).toBe(2);
  });

  it("does not bump while staying on Nuevo or when opening an existing training", () => {
    expect(nextNewTrainingVisit(NEW_TRAINING_PATH, NEW_TRAINING_PATH, 2)).toBe(2);
    expect(nextNewTrainingVisit(NEW_TRAINING_PATH, "/staff/biblioteca/abc/editar", 2)).toBe(2);
  });
});
