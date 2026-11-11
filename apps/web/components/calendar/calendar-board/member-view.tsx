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
import { PX_PER_HOUR, PX_PER_HOUR_LARGE } from "@/lib/box/column";
import { chipClass } from "@/components/common/filters/kind-tabs";
import { SegmentSlideList, segmentSlideHandlers, useSegmentSlide } from "@/components/common/filters/segment-slide";
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
  boxes = [],
  boxId,
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
          <ModuleHeaderTabStack>
            <BoxTabs boxes={boxes} boxId={boxId ?? ""} hrefFor={(id) => calendarHref(basePath, semana, view, id)} />
            <KindTabs
              view={view}
              directedHref={calendarHref(basePath, semana, "dirigidas", boxId)}
              openHref={calendarHref(basePath, semana, "open", boxId)}
            />
          </ModuleHeaderTabStack>
        }
        action={
          desktop ? (
            <SegmentSlideList role="group" aria-label="Tamaño del calendario" className="flex gap-0.5 rounded-md bg-muted p-0.5">
              <DensityButton pressed={density === "pequeno"} onClick={() => choose("pequeno")}>
                Pequeño
              </DensityButton>
              <DensityButton pressed={density === "mediano"} onClick={() => choose("mediano")}>
                Mediano
              </DensityButton>
              <DensityButton pressed={density === "grande"} onClick={() => choose("grande")}>
                Grande
              </DensityButton>
            </SegmentSlideList>
          ) : null
        }
        toolbar={
          <div className="flex w-full justify-center">
            <WeekNav basePath={basePath} view={view} boxId={boxId} week={week} width="content" />
          </div>
        }
      />
      <ModuleBody fill>
        {classes.length === 0 ? (
          <div className="px-4 pt-3 md:px-6"><EmptyState compact title={view === "open" ? emptyOpen : emptyDirected} description="Podés elegir otra semana o cambiar de grilla. Las franjas cerradas conservan su horario." /></div>
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
  const slide = useSegmentSlide();
  const handlers = segmentSlideHandlers(slide);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      {...handlers}
      className={slide ? slide.chipClass(pressed) : chipClass(pressed)}
    >
      {children}
    </button>
  );
}
