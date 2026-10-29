import { atBoxTime } from "@78feet/domain";

const timeFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "long",
  day: "numeric",
  month: "short",
});

const weekdayFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
});

const dayNumberFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
});

const rangeFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "short",
});

const chipDayFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
});

const chipMonthFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  month: "short",
});

const moneyFormat = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatTime(value: Date): string {
  return timeFormat.format(value);
}

export function formatDay(isoDate: string): string {
  return capitalize(dayFormat.format(atBoxTime(isoDate, "12:00")));
}

export function formatWeekday(isoDate: string): string {
  return capitalize(weekdayFormat.format(atBoxTime(isoDate, "12:00")).replace(".", ""));
}

export function formatDayNumber(isoDate: string): string {
  return dayNumberFormat.format(atBoxTime(isoDate, "12:00"));
}

export function formatWeekRange(from: string, to: string): string {
  const start = rangeFormat.format(atBoxTime(from, "12:00"));
  const end = rangeFormat.format(atBoxTime(to, "12:00"));
  return `${start} – ${end}`;
}

export function formatWeekChip(isoDate: string): { day: string; month: string } {
  const at = atBoxTime(isoDate, "12:00");
  return {
    day: chipDayFormat.format(at),
    month: chipMonthFormat.format(at).replace(".", ""),
  };
}

const monthFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  month: "long",
  year: "numeric",
});

export function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split("-");
  return capitalize(monthFormat.format(atBoxTime(`${year}-${month}-01`, "12:00")));
}

export function formatPrice(cents: number): string {
  return moneyFormat.format(cents / 100);
}

export function freeSpotLabel(free: number): string {
  if (free <= 0) return "Completa";
  if (free === 1) return "1 libre";
  return `${free} libres`;
}

export function kindLabel(kind: "directed" | "open"): string {
  return kind === "directed" ? "Dirigida" : "Open";
}
