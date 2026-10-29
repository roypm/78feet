import { parseClock } from "@78feet/domain";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function normalizeClock(time: string): string {
  const { hour, minute, second } = parseClock(time);
  return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

export function clockToDb(time: string): Date {
  const { hour, minute, second } = parseClock(time);
  return new Date(Date.UTC(1970, 0, 1, hour, minute, second));
}

export function clockFromDb(value: Date): string {
  return `${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}:${pad2(value.getUTCSeconds())}`;
}

export function isoDateToDb(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function isoDateFromDb(value: Date): string {
  return value.toISOString().slice(0, 10);
}
