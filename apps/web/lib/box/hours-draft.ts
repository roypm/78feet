import type { BoxHoursConfig } from "@78feet/domain";

export function copyWeeklyHours(config: BoxHoursConfig, sourceWeekday: number, targetWeekdays: number[]): BoxHoursConfig {
  const source = config.weekly.find((day) => day.weekday === sourceWeekday);
  if (!source) return config;
  return {
    ...config,
    weekly: config.weekly.map((day) =>
      day.weekday !== sourceWeekday && targetWeekdays.includes(day.weekday)
        ? { ...day, intervals: source.intervals.map((interval) => ({ ...interval })) }
        : day,
    ),
  };
}
