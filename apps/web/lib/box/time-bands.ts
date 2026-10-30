import { clockToMinutes } from "@78feet/domain";

export type OpeningInterval = { openTime: string; closeTime: string };
export type ClosedBand = { start: number; end: number; label: string };

export function closedTimeBands(
  intervals: readonly OpeningInterval[],
  axisStart: number,
  axisEnd: number,
): ClosedBand[] {
  if (intervals.length === 0) {
    return axisEnd > axisStart ? [{ start: axisStart, end: axisEnd, label: "Cerrado todo el día" }] : [];
  }

  const sorted = intervals
    .map((interval) => ({ start: clockToMinutes(interval.openTime), end: clockToMinutes(interval.closeTime) }))
    .sort((a, b) => a.start - b.start);
  const bands: ClosedBand[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (!previous || !current || current.start <= previous.end) continue;
    const start = Math.max(axisStart, previous.end);
    const end = Math.min(axisEnd, current.start);
    if (end <= start) continue;
    bands.push({
      start,
      end,
      label: `Cerrado de ${formatClock(start)} a ${formatClock(end)}`,
    });
  }
  return bands;
}

function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
