import { horizonRange, localDateString, weekStartDate } from "@78feet/domain";

/** Enlace de vuelta al listado staff desde el detalle de una clase. */
export function staffClassListBack(instanceDate: string, now = new Date()) {
  const today = localDateString(now);
  if (instanceDate === today) {
    return { href: "/staff/hoy" as const, label: "Hoy" };
  }
  const horizon = horizonRange(today);
  if (instanceDate >= horizon.from && instanceDate <= horizon.to) {
    const start = weekStartDate(instanceDate);
    const href =
      start === weekStartDate(today) ? "/staff/semana" : `/staff/semana?semana=${start}`;
    return { href, label: "Semana" as const };
  }
  return { href: "/staff/excepciones" as const, label: "Excepciones" };
}
