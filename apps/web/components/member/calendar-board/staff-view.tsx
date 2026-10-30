"use client";

import { BLOCK_INSET, calendarAxis, columnHeight } from "@/lib/box/calendar-layout";
import { calendarHref } from "@/lib/box/calendar-navigation";
import { KindTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
import { CalendarGrid } from "./grid";
import { WeekNav } from "./week-nav";
import type { CalendarBoardCoreProps } from "./types";
import { cn } from "cn";
import { PX_PER_HOUR } from "@/lib/box/column";
import { moduleContentInset } from "@/components/member/module-page";

const STAFF_DAY_COLUMN_PX = 136;

export function StaffCalendarBoard({
  view,
  semana,
  today,
  week,
  days,
  classes,
  hours,
  openingHours,
  title,
  basePath,
  classHrefPrefix,
  emptyDirected,
  emptyOpen,
  description,
}: CalendarBoardCoreProps & { description?: string }) {
  const pxPerHour = PX_PER_HOUR;
  const axis = calendarAxis(classes, hours);
  const height = columnHeight(classes, axis.axisStart, axis.axisEnd, pxPerHour);
  const blockWidth = STAFF_DAY_COLUMN_PX - BLOCK_INSET * 2;
  const emptyMessage = view === "open" ? emptyOpen : emptyDirected;

  return (
    <ModulePage>
      <ModuleHeader
        title={title}
        description={description}
        tabs={
          <KindTabs
            view={view}
            directedHref={calendarHref(basePath, semana, "dirigidas")}
            openHref={calendarHref(basePath, semana, "open")}
          />
        }
      />
      <ModuleBody fill>
        <section className={cn("flex min-h-0 flex-1 flex-col gap-3", moduleContentInset)}>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : null}
          {openingHours ? (
            <p className="text-xs text-muted-foreground">Las franjas tramadas indican que el box está cerrado.</p>
          ) : null}

          <div className="flex w-max max-w-full min-h-0 flex-1 flex-col gap-2 self-start">
            <WeekNav
              basePath={basePath}
              view={view}
              week={week}
              width="calendar"
            />
            <div className="min-h-[20rem] flex-1 overflow-auto overscroll-contain rounded-lg border border-border bg-background">
              <CalendarGrid
                days={days}
                today={today}
                classes={classes}
                openingHours={openingHours}
                axis={axis}
                height={height}
                pxPerHour={pxPerHour}
                dayColumnPx={STAFF_DAY_COLUMN_PX}
                timeColumn="4rem"
                classHrefPrefix={classHrefPrefix}
                blockWidth={blockWidth}
                minBlockHeight={56}
                textClass="text-xs"
              />
            </div>
          </div>
        </section>
      </ModuleBody>
    </ModulePage>
  );
}
