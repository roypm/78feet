export function resolveFilter<T extends { slug: string }>(items: readonly T[], value?: string): T | undefined {
  return items.find((item) => item.slug === value);
}
