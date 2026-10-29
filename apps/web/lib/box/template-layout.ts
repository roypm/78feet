import { BOX_CLOSE_TIME, BOX_OPEN_TIME, clockToMinutes } from "@78feet/domain";

export type TemplateTimeRange = { startTime: string; endTime: string };
export type TemplateHours = { openTime: string; closeTime: string };

export function templateAxis(
  templates: TemplateTimeRange[],
  hours: TemplateHours = { openTime: BOX_OPEN_TIME, closeTime: BOX_CLOSE_TIME },
) {
  let axisStart = clockToMinutes(hours.openTime);
  let axisEnd = clockToMinutes(hours.closeTime);

  for (const template of templates) {
    const start = clockToMinutes(template.startTime);
    const end = clockToMinutes(template.endTime);
    axisStart = Math.min(axisStart, Math.floor(start / 60) * 60);
    axisEnd = Math.max(axisEnd, Math.ceil(end / 60) * 60);
  }

  const hoursOnAxis: number[] = [];
  const ticks: number[] = [];
  for (let minutes = axisStart; minutes <= axisEnd; minutes += 15) {
    ticks.push(minutes);
    if (minutes % 60 === 0) hoursOnAxis.push(minutes);
  }

  return { axisStart, axisEnd, hours: hoursOnAxis, ticks };
}

export function templateBlockBox(
  template: TemplateTimeRange,
  axisStart: number,
  pxPerHour: number,
): { top: number; height: number } {
  const start = clockToMinutes(template.startTime);
  const end = clockToMinutes(template.endTime);
  const duration = Math.max(end - start, 60);

  return {
    top: ((start - axisStart) / 60) * pxPerHour,
    height: (duration / 60) * pxPerHour,
  };
}
