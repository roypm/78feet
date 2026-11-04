import { DomainError } from "./errors";
import { zonedParts } from "./time";
import type { ClassKind, TrainingPhaseInput } from "./types";

export const TRAINING_NAME_TAKEN = "Ya hay un entrenamiento con ese nombre.";

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

export function collapseTrainingName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function trainingNameKey(value: string): string {
  return collapseTrainingName(value).toLocaleLowerCase("es-ES");
}

export function datedTrainingName(at: Date): string {
  const { day, month, year } = zonedParts(at);
  return `${day} ${MONTHS_SHORT[month - 1]} ${year}`;
}

export function uniqueDatedTrainingName(existingNames: readonly string[], at: Date): string {
  const taken = new Set(existingNames.map(trainingNameKey));
  const base = datedTrainingName(at);
  if (!taken.has(trainingNameKey(base))) return base;
  for (let n = 2; n < 10_000; n += 1) {
    const candidate = `${base} · ${n}`;
    if (!taken.has(trainingNameKey(candidate))) return candidate;
  }
  return `${base} · ${at.getTime()}`;
}

export function resolveTrainingName(input: string, existingNames: readonly string[], at: Date): string {
  const typed = collapseTrainingName(input);
  if (!typed) return uniqueDatedTrainingName(existingNames, at);
  if (existingNames.some((name) => trainingNameKey(name) === trainingNameKey(typed))) {
    throw new DomainError("FORBIDDEN", TRAINING_NAME_TAKEN);
  }
  return typed;
}

export function assertDirectedClassType(kind: ClassKind): void {
  if (kind !== "directed") {
    throw new DomainError("FORBIDDEN", "Un open no tiene entrenamientos");
  }
}

export function assertTrainingContent(phases: readonly TrainingPhaseInput[]): void {
  if (phases.length === 0) {
    throw new DomainError("FORBIDDEN", "Un entrenamiento necesita al menos una fase");
  }
  for (const [phaseIndex, phase] of phases.entries()) {
    if (!phase.name.trim()) {
      throw new DomainError("FORBIDDEN", "Cada fase necesita un nombre");
    }
    if (phase.blocks.length === 0) {
      throw new DomainError("FORBIDDEN", "Cada fase necesita al menos un bloque");
    }
    for (const block of phase.blocks) {
      if (!block.body.trim()) {
        throw new DomainError("FORBIDDEN", "Un bloque no puede estar vacío");
      }
    }
    void phaseIndex;
  }
}

export function requireDetachConfirm(detachCount: number, confirmDetach: boolean): void {
  if (detachCount > 0 && !confirmDetach) {
    throw new DomainError(
      "CONFIRM_REQUIRED",
      detachCount === 1
        ? "1 clase se queda sin plan"
        : `${detachCount} clases se quedan sin plan`,
      { detachCount },
    );
  }
}
