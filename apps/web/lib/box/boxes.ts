import { ApiError } from "@78feet/api-client";

export type BoxSummary = {
  id: string;
  name: string;
  slug: string;
};

export function orderBoxes(
  boxes: readonly BoxSummary[],
  preferenceBoxId: string | null | undefined,
): BoxSummary[] {
  if (!preferenceBoxId) return [...boxes];
  const index = boxes.findIndex((box) => box.id === preferenceBoxId);
  if (index <= 0) return [...boxes];
  const preferred = boxes[index]!;
  return [preferred, ...boxes.filter((box) => box.id !== preferenceBoxId)];
}

export function pickBox(
  boxes: readonly BoxSummary[],
  requested: string | undefined,
  preferenceBoxId?: string | null,
): BoxSummary {
  const match = boxes.find((box) => box.id === requested);
  const preferred = preferenceBoxId
    ? boxes.find((box) => box.id === preferenceBoxId)
    : undefined;
  const box = match ?? preferred ?? boxes[0];
  if (!box) throw new ApiError(500, "FORBIDDEN", "No hay ningún box");
  return box;
}
