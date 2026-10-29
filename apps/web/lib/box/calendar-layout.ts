import type { CalendarClass } from "@/lib/box/calendar";
import { BOX_CLOSE_TIME, BOX_OPEN_TIME, clockToMinutes } from "@78feet/domain";

export type CalendarHours = { openTime: string; closeTime: string };

export const BLOCK_INSET = 2;
const MIN_BLOCK_MINUTES = 60;

export function madridMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function clockLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function spanMinutes(item: CalendarClass): { start: number; end: number } {
  const start = madridMinutes(item.startAt);
  let end = madridMinutes(item.endAt);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

export function calendarAxis(
  classes: CalendarClass[],
  hours: CalendarHours = { openTime: BOX_OPEN_TIME, closeTime: BOX_CLOSE_TIME },
): {
  axisStart: number;
  axisEnd: number;
  hours: number[];
  ticks: number[];
} {
  let axisStart = clockToMinutes(hours.openTime);
  let axisEnd = clockToMinutes(hours.closeTime);
  for (const item of classes) {
    const span = spanMinutes(item);
    axisStart = Math.min(axisStart, Math.floor(span.start / 60) * 60);
    axisEnd = Math.max(axisEnd, Math.ceil(span.end / 60) * 60);
  }
  const hourMarks: number[] = [];
  const ticks: number[] = [];
  for (let minutes = axisStart; minutes <= axisEnd; minutes += 15) {
    ticks.push(minutes);
    if (minutes % 60 === 0) hourMarks.push(minutes);
  }
  return { axisStart, axisEnd, hours: hourMarks, ticks };
}

export function blockBox(
  item: CalendarClass,
  axisStart: number,
  pxPerHour: number,
): { top: number; height: number } {
  const span = spanMinutes(item);
  const duration = Math.max(span.end - span.start, MIN_BLOCK_MINUTES);
  return {
    top: ((span.start - axisStart) / 60) * pxPerHour,
    height: (duration / 60) * pxPerHour,
  };
}

export function columnHeight(
  classes: CalendarClass[],
  axisStart: number,
  axisEnd: number,
  pxPerHour: number,
): number {
  let height = ((axisEnd - axisStart) / 60) * pxPerHour;
  for (const item of classes) {
    const box = blockBox(item, axisStart, pxPerHour);
    height = Math.max(height, box.top + box.height);
  }
  return height;
}
