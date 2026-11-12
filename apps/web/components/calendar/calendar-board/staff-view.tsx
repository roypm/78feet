"use client";

import { EmptyState } from "@/components/common/feedback/empty-state";

import { BLOCK_INSET, calendarAxis, columnHeight } from "@/lib/box/calendar-layout";
import { calendarHref } from "@/lib/box/calendar-navigation";
import { KindTabs } from "@/components/common/filters/kind-tabs";
import { BoxTabs } from "@/components/boxes/box-tabs";
import { ModuleBody, ModuleHeader, ModulePage, ModuleHeaderTabStack } from "@/components/common/layout/module-page";
import { CalendarGrid } from "./grid";
import { WeekNav } from "./week-nav";
import type { CalendarBoardCoreProps } from "./types";
import { cn } from "cn";
import { PX_PER_HOUR } from "@/lib/box/column";
import { moduleContentInset } from "@/components/common/layout/module-page";

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
  classHrefSearch,
  boxes = [],
  boxId,
  emptyDirected,
  emptyOpen,
  description,
}: CalendarBoardCoreProps & { description?: string }) {
  const pxPerHour = PX_PER_HOUR;
  const axis = calendarAxis(classes, hours);
  const height = columnHeight(classes, axis.axisStart, axis.axisEnd, pxPerHour);
  const blockWidth = STAFF_DAY_COLUMN_PX - BLOCK_INSET * 2;
  const emptyMessage = view === "open" ? emptyOpen : emptyDirected;

  const boxSlug = boxes.find((box) => box.id === boxId)?.slug;

  return (
    <ModulePage>
      <ModuleHeader
        title={title}
        description={description}
        tabs={
          <ModuleHeaderTabStack>
            <BoxTabs boxes={boxes} boxId={boxId ?? ""} hrefFor={(id) => calendarHref(basePath, semana, view, id)} />
            <KindTabs
              view={view}
              directedHref={calendarHref(basePath, semana, "dirigidas", boxSlug)}
              openHref={calendarHref(basePath, semana, "open", boxSlug)}
            />
          </ModuleHeaderTabStack>
        }
      />
      <ModuleBody fill>
        <section className={cn("flex min-h-0 flex-1 flex-col gap-3", moduleContentInset)}>
          {classes.length === 0 ? (
            <EmptyState compact title={emptyMessage} description="Podés consultar otra semana o añadir una clase puntual desde Excepciones." href="/staff/excepciones" action="Ver excepciones" />
          ) : null}
          <div className="flex w-max max-w-full min-h-0 flex-1 flex-col gap-2 self-start">
            <WeekNav
              basePath={basePath}
              view={view}
              boxSlug={boxSlug}
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
                classHrefSearch={classHrefSearch}
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
