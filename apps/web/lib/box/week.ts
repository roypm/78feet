import { addDays, horizonRange, localDateString, weekEndDate, weekStartDate } from "@78feet/domain";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function memberWeek(now: Date, semana: string | undefined) {
  const today = localDateString(now);
  const horizon = horizonRange(today);
  const current = weekStartDate(today);
  const last = weekStartDate(horizon.to);
  let start = current;
  if (semana && ISO_DATE.test(semana)) {
    const requested = weekStartDate(semana);
    if (requested > last) start = last;
    else if (requested > current) start = requested;
  }
  const weekEnd = weekEndDate(start);
  const weeks: { start: string; end: string }[] = [];
  for (let cursor = current; cursor <= last; cursor = addDays(cursor, 7)) {
    const end = weekEndDate(cursor);
    weeks.push({ start: cursor, end: end < horizon.to ? end : horizon.to });
  }
  return {
    today,
    horizonEnd: horizon.to,
    start,
    end: weekEnd < horizon.to ? weekEnd : horizon.to,
    weeks,
    canPrev: start > current,
    canNext: addDays(start, 7) <= last,
    prev: addDays(start, -7),
    next: addDays(start, 7),
  };
}
