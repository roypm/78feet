import {
  BOX_OPEN_TIME,
  BOX_CLOSE_TIME,
  isOpenDuring,
  type BoxHoursConfig,
} from "@78feet/domain";

export function calendarAxisRange(config: BoxHoursConfig): {
  openTime: string;
  closeTime: string;
} {
  const intervals = config.weekly.flatMap((day) => day.intervals);
  for (const exception of config.exceptions)
    intervals.push(...exception.intervals);
  if (intervals.length === 0)
    return { openTime: BOX_OPEN_TIME, closeTime: BOX_CLOSE_TIME };
  return {
    openTime: intervals.reduce(
      (earliest, interval) =>
        interval.openTime < earliest ? interval.openTime : earliest,
      intervals[0]!.openTime,
    ),
    closeTime: intervals.reduce(
      (latest, interval) =>
        interval.closeTime > latest ? interval.closeTime : latest,
      intervals[0]!.closeTime,
    ),
  };
}

export function isDateOpenDuring(
  config: BoxHoursConfig,
  date: string,
  start: string,
  end: string,
): boolean {
  return isOpenDuring(config, date, start, end);
}
