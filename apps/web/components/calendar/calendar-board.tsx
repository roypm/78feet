import type { BoxHoursConfig } from "@78feet/domain";
import type { CalendarClass } from "@/lib/box/calendar";
import type { CalendarHours } from "@/lib/box/calendar-layout";
import type { BoxSummary } from "@/lib/box/boxes";
import type { CalendarView, CalendarWeek } from "./calendar-board/types";
import { StaffCalendarBoard } from "./calendar-board/staff-view";
import { MemberCalendarBoard } from "./calendar-board/member-view";

export function CalendarBoard({
  view,
  semana,
  today,
  week,
  days,
  classes,
  hours,
  openingHours,
  title = "Calendario",
  basePath = "/calendario",
  classHrefPrefix = "/clases",
  classHrefSearch,
  boxes,
  boxId,
  emptyDirected = "No hay clases dirigidas esta semana.",
  emptyOpen = "No hay opens esta semana.",
  variant = "member",
  description,
}: {
  view: CalendarView;
  semana: string | undefined;
  today: string;
  week: CalendarWeek;
  days: string[];
  classes: CalendarClass[];
  hours?: CalendarHours;
  openingHours?: BoxHoursConfig;
  title?: string;
  basePath?: string;
  classHrefPrefix?: string;
  classHrefSearch?: string;
  boxes?: readonly BoxSummary[];
  boxId?: string;
  emptyDirected?: string;
  emptyOpen?: string;
  variant?: "member" | "staff";
  description?: string;
}) {
  if (variant === "staff") {
    return (
      <StaffCalendarBoard
        view={view}
        semana={semana}
        today={today}
        week={week}
        days={days}
        classes={classes}
        hours={hours}
        openingHours={openingHours}
        title={title}
        basePath={basePath}
        classHrefPrefix={classHrefPrefix}
        classHrefSearch={classHrefSearch}
        boxes={boxes}
        boxId={boxId}
        emptyDirected={emptyDirected}
        emptyOpen={emptyOpen}
        description={description}
      />
    );
  }

  return (
    <MemberCalendarBoard
      view={view}
      semana={semana}
      today={today}
      week={week}
      days={days}
      classes={classes}
      hours={hours}
      openingHours={openingHours}
      title={title}
      basePath={basePath}
      classHrefPrefix={classHrefPrefix}
      boxes={boxes}
      boxId={boxId}
      emptyDirected={emptyDirected}
      emptyOpen={emptyOpen}
    />
  );
}
