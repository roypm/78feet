export const BOX_TIME_ZONE = "Europe/Madrid";
export const BOOKING_HORIZON_DAYS = 28;
export const MEMBER_CANCEL_LEAD_MS = 2 * 60 * 60 * 1000;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BOX_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export type IsoDate = string;
export type ClockTime = string;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function partNumber(parts: Intl.DateTimeFormatPart[], type: string): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (value === undefined) {
    throw new Error(`missing date part: ${type}`);
  }
  return Number(value);
}

export function parseIsoDate(date: string): { year: number; month: number; day: number } {
  const match = ISO_DATE.exec(date);
  if (!match) {
    throw new Error(`invalid ISO date: ${date}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function parseClock(time: string): { hour: number; minute: number; second: number } {
  const match = CLOCK.exec(time);
  if (!match) {
    throw new Error(`invalid clock time: ${time}`);
  }
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] ?? 0),
  };
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function zonedParts(instant: Date): ZonedParts {
  const parts = zonedPartsFormatter.formatToParts(instant);
  return {
    year: partNumber(parts, "year"),
    month: partNumber(parts, "month"),
    day: partNumber(parts, "day"),
    hour: partNumber(parts, "hour"),
    minute: partNumber(parts, "minute"),
    second: partNumber(parts, "second"),
  };
}

export function localDateString(instant: Date): string {
  const parts = zonedParts(instant);
  return formatIsoDate(parts.year, parts.month, parts.day);
}

export function atBoxTime(date: string, time: string): Date {
  const { year, month, day } = parseIsoDate(date);
  const { hour, minute, second } = parseClock(time);
  return zonedLocalToUtc(year, month, day, hour, minute, second);
}

function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = desired;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = zonedParts(new Date(utc));
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    utc += desired - asUtc;
  }
  return new Date(utc);
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseIsoDate(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return formatIsoDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function weekdayMonday1(date: string): number {
  const { year, month, day } = parseIsoDate(date);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function weekStartDate(date: string): string {
  return addDays(date, 1 - weekdayMonday1(date));
}

export function weekEndDate(date: string): string {
  return addDays(weekStartDate(date), 6);
}

export function weekStart(date: string): Date {
  return atBoxTime(weekStartDate(date), "00:00:00");
}

export function weekEnd(date: string): Date {
  const end = atBoxTime(weekEndDate(date), "23:59:59");
  return new Date(end.getTime() + 999);
}

export function dateInWeek(date: string, weekDate: string): boolean {
  return date >= weekStartDate(weekDate) && date <= weekEndDate(weekDate);
}

/** Next Monday after `today`. If `today` is Monday, returns the following week. */
export function nextMondayDate(today: string): string {
  return addDays(today, 8 - weekdayMonday1(today));
}

export function horizonRange(today: string): { from: string; to: string } {
  return { from: today, to: addDays(today, BOOKING_HORIZON_DAYS) };
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function datesOnWeekday(from: string, to: string, weekday: number): string[] {
  return eachDate(from, to).filter((date) => weekdayMonday1(date) === weekday);
}

export function clockToMinutes(time: string): number {
  const { hour, minute } = parseClock(time);
  return hour * 60 + minute;
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function clockIntervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return clockToMinutes(aStart) < clockToMinutes(bEnd) && clockToMinutes(bStart) < clockToMinutes(aEnd);
}

export function memberCanCancel(now: Date, startAt: Date): boolean {
  return now.getTime() <= startAt.getTime() - MEMBER_CANCEL_LEAD_MS;
}

export function instanceHasStarted(now: Date, startAt: Date): boolean {
  return now.getTime() >= startAt.getTime();
}
