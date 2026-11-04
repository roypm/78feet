import type { KindView } from "./day-groups";

export function calendarHref(
  basePath: string,
  semana: string | undefined,
  view: KindView,
  boxId?: string,
): string {
  const params = new URLSearchParams();
  if (boxId) params.set("box", boxId);
  if (semana) params.set("semana", semana);
  if (view === "open") params.set("tipo", "open");
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
