import { DomainError } from "./errors";
import type { ClassKind, TrainingPhaseInput } from "./types";

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
