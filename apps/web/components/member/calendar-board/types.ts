import type { BoxHoursConfig } from "@78feet/domain";
import type { CalendarClass } from "@/lib/box/calendar";
import type { CalendarHours } from "@/lib/box/calendar-layout";
import type { KindView } from "@/lib/box/day-groups";

export type CalendarView = KindView;

export type CalendarWeek = {
  start: string;
  canPrev: boolean;
  canNext: boolean;
  prev: string;
  next: string;
  weeks: { start: string; end: string }[];
};

export type CalendarBoardCoreProps = {
  view: CalendarView;
  semana: string | undefined;
  today: string;
  week: CalendarWeek;
  days: string[];
  classes: CalendarClass[];
  hours?: CalendarHours;
  openingHours?: BoxHoursConfig;
  title: string;
  basePath: string;
  classHrefPrefix: string;
  emptyDirected: string;
  emptyOpen: string;
};
