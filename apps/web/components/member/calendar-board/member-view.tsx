"use client";

import { BLOCK_INSET, calendarAxis, columnHeight } from "@/lib/box/calendar-layout";
import { calendarHref } from "@/lib/box/calendar-navigation";
import { KindTabs } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";
import { CalendarGrid } from "./grid";
import { WeekNav } from "./week-nav";
import type { CalendarBoardCoreProps } from "./types";
import { PX_PER_HOUR, PX_PER_HOUR_LARGE } from "@/lib/box/column";
import { chipClass } from "@/components/member/kind-tabs";
import { useCalendarScale } from "./use-calendar-scale";

export function MemberCalendarBoard({
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
}: CalendarBoardCoreProps) {
  const { desktop, density, choose, pxPerHour } = useCalendarScale();
  const text = pxPerHour >= PX_PER_HOUR_LARGE ? "text-base" : pxPerHour > PX_PER_HOUR ? "text-sm" : "text-xs";
  const axis = calendarAxis(classes, hours);
  const height = columnHeight(classes, axis.axisStart, axis.axisEnd, pxPerHour);

  return (
    <ModulePage>
      <ModuleHeader
        title={title}
        description="Cuatro semanas de clases. Tocá un bloque para reservar o ver plazas y roster."
        tabs={
          <KindTabs
            view={view}
            directedHref={calendarHref(basePath, semana, "dirigidas")}
            openHref={calendarHref(basePath, semana, "open")}
          />
        }
        action={
          desktop ? (
            <div className="flex w-fit rounded-md bg-muted p-0.5" role="group" aria-label="Tamaño del calendario">
              <DensityButton pressed={density === "pequeno"} onClick={() => choose("pequeno")}>
                Pequeño
              </DensityButton>
              <DensityButton pressed={density === "mediano"} onClick={() => choose("mediano")}>
                Mediano
              </DensityButton>
              <DensityButton pressed={density === "grande"} onClick={() => choose("grande")}>
                Grande
              </DensityButton>
            </div>
          ) : null
        }
        toolbar={
          <div className="flex w-full justify-center">
            <WeekNav basePath={basePath} view={view} week={week} width="content" />
          </div>
        }
      />
      <ModuleBody fill>
        {classes.length === 0 ? (
          <p className="px-4 pt-4 text-muted-foreground md:px-6">
            {view === "open" ? emptyOpen : emptyDirected}
          </p>
        ) : null}
        {openingHours ? (
          <p className="px-4 pt-2 text-xs text-muted-foreground md:px-6">Las franjas tramadas indican que el box está cerrado.</p>
        ) : null}
        <div
          className="flex min-h-0 flex-1 overflow-auto overscroll-contain pb-6"
          style={{ justifyContent: "safe center", alignItems: "flex-start" }}
        >
          {classes.length === 0 && !openingHours ? null : (
            <CalendarGrid
            days={days}
            today={today}
            classes={classes}
            openingHours={openingHours}
            axis={axis}
            height={height}
            pxPerHour={pxPerHour}
            dayColumnPx={pxPerHour}
            timeColumn="4.5rem"
            classHrefPrefix={classHrefPrefix}
            blockWidth={pxPerHour - BLOCK_INSET * 2}
            minBlockHeight={pxPerHour - BLOCK_INSET * 2}
            textClass={text}
            />
          )}
        </div>
      </ModuleBody>
    </ModulePage>
  );
}

function DensityButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={chipClass(pressed)}>
      {children}
    </button>
  );
}
