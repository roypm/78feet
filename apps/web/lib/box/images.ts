export function classTypeImageUrl(imageKey: string | null): string | null {
  if (!imageKey) return null;
  return `/api/v1/class-type-images/${encodeURIComponent(imageKey)}`;
}
