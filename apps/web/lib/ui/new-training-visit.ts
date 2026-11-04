export const NEW_TRAINING_PATH = "/staff/biblioteca/nuevo";

export function nextNewTrainingVisit(previousPath: string | null, path: string, visit: number): number {
  if (path === NEW_TRAINING_PATH && previousPath !== null && previousPath !== path) {
    return visit + 1;
  }
  return visit;
}
