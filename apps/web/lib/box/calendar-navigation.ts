import type { KindView } from "./day-groups";

export function calendarHref(
  basePath: string,
  semana: string | undefined,
  view: KindView,
  boxSlug?: string,
): string {
  const params = new URLSearchParams();
  if (boxSlug) params.set("box", boxSlug);
  if (semana) params.set("semana", semana);
  if (view === "open") params.set("grilla", "open");
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
