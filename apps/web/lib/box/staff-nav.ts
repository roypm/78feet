import { weekStartDate, localDateString } from "@78feet/domain";

export const STAFF_CLASS_ORIGINS = ["hoy", "semana", "excepciones"] as const;
export type StaffClassOrigin = (typeof STAFF_CLASS_ORIGINS)[number];

export function parseStaffClassOrigin(desde: string | undefined): StaffClassOrigin {
  if (desde === "hoy" || desde === "excepciones") return desde;
  return "semana";
}

/** Enlace de vuelta al listado staff desde el detalle de una clase. */
export function staffClassOriginBack(
  origin: StaffClassOrigin,
  instanceDate: string,
  now = new Date(),
  boxSlug?: string,
): { href: string; label: "Hoy" | "Semana" | "Excepciones" } {
  if (origin === "hoy") {
    return { href: boxSlug ? `/staff/hoy?box=${boxSlug}` : "/staff/hoy", label: "Hoy" };
  }
  if (origin === "excepciones") return { href: "/staff/excepciones", label: "Excepciones" };
  const today = localDateString(now);
  const start = weekStartDate(instanceDate);
  const params = new URLSearchParams();
  if (boxSlug) params.set("box", boxSlug);
  if (start !== weekStartDate(today)) params.set("semana", start);
  const query = params.toString();
  return { href: query ? `/staff/semana?${query}` : "/staff/semana", label: "Semana" };
}
