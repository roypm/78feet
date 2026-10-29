"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CalendarClass } from "@/lib/box/calendar";
import {
  BLOCK_INSET,
  blockBox,
  calendarAxis,
  clockLabel,
  columnHeight,
  type CalendarHours,
} from "@/lib/box/calendar-layout";
import { PX_PER_HOUR, PX_PER_HOUR_LARGE, PX_PER_HOUR_MEDIUM } from "@/lib/box/column";
import { formatDayNumber, formatTime, formatWeekChip, formatWeekday, formatWeekRange } from "@/lib/box/format";
import { ModuleBody, ModuleHeader, ModulePage } from "@/components/member/module-page";

const DENSITY_KEY = "78feet.calendario.densidad";
type Density = "pequeno" | "mediano" | "grande";
const PX_BY_DENSITY: Record<Density, number> = {
  pequeno: PX_PER_HOUR,
  mediano: PX_PER_HOUR_MEDIUM,
  grande: PX_PER_HOUR_LARGE,
};
type CalendarView = "dirigidas" | "open";

type WeekNav = {
  start: string;
  canPrev: boolean;
  canNext: boolean;
  prev: string;
  next: string;
  weeks: { start: string; end: string }[];
};

function calendarHref(basePath: string, semana: string | undefined, view: CalendarView): string {
  const params = new URLSearchParams();
  if (semana) params.set("semana", semana);
  if (view === "open") params.set("tipo", "open");
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function useCalendarScale(): {
  desktop: boolean;
  density: Density;
  choose: (next: Density) => void;
  pxPerHour: number;
} {
  const [desktop, setDesktop] = useState(false);
  const [density, setDensity] = useState<Density>("pequeno");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    const stored = window.localStorage.getItem(DENSITY_KEY);
    if (stored === "mediano" || stored === "grande") setDensity(stored);
    else if (stored === "comodo") setDensity("pequeno");
    return () => media.removeEventListener("change", apply);
  }, []);

  function choose(next: Density) {
    setDensity(next);
    window.localStorage.setItem(DENSITY_KEY, next);
  }

  return {
    desktop,
    density,
    choose,
    pxPerHour: desktop ? PX_BY_DENSITY[density] : PX_PER_HOUR,
  };
}

export function CalendarBoard({
  view,
  semana,
  today,
  week,
  days,
  classes,
  hours,
  title = "Calendario",
  basePath = "/calendario",
  classHrefPrefix = "/clases",
  emptyDirected = "No hay clases dirigidas esta semana.",
  emptyOpen = "No hay opens esta semana.",
}: {
  view: CalendarView;
  semana: string | undefined;
  today: string;
  week: WeekNav;
  days: string[];
  classes: CalendarClass[];
  hours?: CalendarHours;
  title?: string;
  basePath?: string;
  classHrefPrefix?: string;
  emptyDirected?: string;
  emptyOpen?: string;
}) {
  const { desktop, density, choose, pxPerHour } = useCalendarScale();
  const text = pxPerHour >= PX_PER_HOUR_LARGE ? "text-base" : pxPerHour > PX_PER_HOUR ? "text-sm" : "text-xs";
  const axis = calendarAxis(classes, hours);
  const height = columnHeight(classes, axis.axisStart, axis.axisEnd, pxPerHour);

  return (
    <ModulePage>
      <ModuleHeader
        dense
        title={title}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-fit rounded-md bg-muted p-0.5" role="tablist" aria-label="Tipo de clase">
              <ViewTab href={calendarHref(basePath, semana, "dirigidas")} active={view === "dirigidas"}>
                Dirigidas
              </ViewTab>
              <ViewTab href={calendarHref(basePath, semana, "open")} active={view === "open"}>
                Open
              </ViewTab>
            </div>
            {desktop ? (
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
            ) : null}
          </div>
        }
      >
        <nav aria-label="Semanas" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          {week.canPrev ? (
            <Link
              href={calendarHref(basePath, week.prev, view)}
              prefetch={true}
              className="flex min-h-8 items-center px-1 text-sm text-primary"
            >
              Anterior
            </Link>
          ) : (
            <span className="flex min-h-8 items-center px-1 text-sm text-muted-foreground">Anterior</span>
          )}
          <div className="flex min-w-0 justify-center">
            <div className="flex w-full gap-1 rounded-md bg-muted p-0.5 sm:w-auto">
              {week.weeks.map((item) => {
                const active = item.start === week.start;
                const chip = formatWeekChip(item.start);
                return (
                  <Link
                    key={item.start}
                    href={calendarHref(basePath, item.start, view)}
                    prefetch={true}
                    aria-current={active ? "page" : undefined}
                    aria-label={`Semana del ${formatWeekRange(item.start, item.end)}`}
                    className={
                      active
                        ? "flex min-h-8 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-sm bg-card px-1 text-xs leading-tight font-semibold text-foreground transition-transform duration-150 ease-out active:scale-[0.97] sm:flex-none sm:px-2"
                        : "flex min-h-8 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center rounded-sm px-1 text-xs leading-tight text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97] sm:flex-none sm:px-2 [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
                    }
                  >
                    <span className="tabular-nums">{chip.day}</span>
                    <span>{chip.month}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          {week.canNext ? (
            <Link
              href={calendarHref(basePath, week.next, view)}
              prefetch={true}
              className="flex min-h-8 items-center justify-self-end px-1 text-sm text-primary"
            >
              Siguiente
            </Link>
          ) : (
            <span className="flex min-h-8 items-center justify-self-end px-1 text-sm text-muted-foreground">
              Siguiente
            </span>
          )}
        </nav>
      </ModuleHeader>
      <ModuleBody fill>
        {classes.length === 0 ? (
          <p className="px-4 pt-4 text-muted-foreground md:px-6">
            {view === "open" ? emptyOpen : emptyDirected}
          </p>
        ) : null}
        <div
          className="flex min-h-0 flex-1 overflow-auto overscroll-contain pb-6"
          style={{ justifyContent: "safe center", alignItems: "flex-start" }}
        >
          <div
            className="grid h-max w-max"
            style={{ gridTemplateColumns: `4.5rem repeat(${days.length}, ${pxPerHour}px)` }}
          >
            <div className="sticky top-0 left-0 z-30 border-b border-border bg-background px-2 py-1 text-center text-xs font-medium text-muted-foreground">
              Hora
            </div>
            {days.map((date) => {
              const isToday = date === today;
              const isPast = date < today;
              return (
                <div
                  key={date}
                  className={
                    isToday
                      ? "sticky top-0 z-20 border-b border-border bg-background px-2 py-1 text-center text-xs font-semibold text-primary"
                      : isPast
                        ? "sticky top-0 z-20 border-b border-border bg-background px-2 py-1 text-center text-xs font-medium text-muted-foreground"
                        : "sticky top-0 z-20 border-b border-border bg-background px-2 py-1 text-center text-xs font-medium"
                  }
                >
                  <span className="block truncate">{formatWeekday(date)}</span>
                  <span className="block tabular-nums">{formatDayNumber(date)}</span>
                </div>
              );
            })}
            {classes.length === 0 ? null : (
              <>
                <div className="sticky left-0 z-20 border-r border-border bg-background" style={{ height }}>
                  <GridLines ticks={axis.ticks} axisStart={axis.axisStart} pxPerHour={pxPerHour} />
                  {axis.hours.map((minutes, index) => {
                    const last = index === axis.hours.length - 1;
                    const top = ((minutes - axis.axisStart) / 60) * pxPerHour;
                    return (
                      <span
                        key={minutes}
                        className="absolute right-1 z-10 text-xs text-muted-foreground tabular-nums"
                        style={{ top: last ? Math.max(0, top - 16) : top }}
                      >
                        {clockLabel(minutes)}
                      </span>
                    );
                  })}
                </div>
                {days.map((date) => (
                  <div
                    key={date}
                    className={date === today ? "relative bg-primary/5" : "relative"}
                    style={{ height }}
                  >
                    <GridLines ticks={axis.ticks} axisStart={axis.axisStart} pxPerHour={pxPerHour} />
                    {classes
                      .filter((item) => item.date === date)
                      .map((item) => {
                        const box = blockBox(item, axis.axisStart, pxPerHour);
                        const side = pxPerHour - BLOCK_INSET * 2;
                        return (
                          <ClassBlock
                            key={item.id}
                            item={item}
                            href={`${classHrefPrefix}/${item.id}`}
                            text={text}
                            top={box.top + BLOCK_INSET}
                            height={Math.max(box.height - BLOCK_INSET * 2, side)}
                            width={side}
                          />
                        );
                      })}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </ModuleBody>
    </ModulePage>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "flex min-h-8 touch-manipulation items-center rounded-sm bg-card px-2.5 text-sm font-semibold text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
    : "flex min-h-8 touch-manipulation items-center rounded-sm px-2.5 text-sm text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground";
}

function ViewTab({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link href={href} prefetch={true} role="tab" aria-selected={active} className={chipClass(active)}>
      {children}
    </Link>
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

function GridLines({ ticks, axisStart, pxPerHour }: { ticks: number[]; axisStart: number; pxPerHour: number }) {
  return ticks.map((minutes) => {
    const primary = minutes % 60 === 0;
    return (
      <span
        key={minutes}
        aria-hidden
        className={
          primary
            ? "absolute inset-x-0 z-[1] border-t border-foreground/30"
            : "absolute inset-x-0 border-t border-foreground/10"
        }
        style={{ top: ((minutes - axisStart) / 60) * pxPerHour }}
      />
    );
  });
}

function ClassBlock({
  item,
  href,
  top,
  height,
  width,
  text,
}: {
  item: CalendarClass;
  href: string;
  top: number;
  height: number;
  width: number;
  text: string;
}) {
  const occupancy = `${item.bookedCount}/${item.capacity}`;
  const range = `${formatTime(new Date(item.startAt))}–${formatTime(new Date(item.endAt))}`;
  const status = item.status === "cancelled" ? "Cancelada" : item.bookedByMe ? "Apuntado" : "";
  return (
    <Link
      href={href}
      prefetch={true}
      title={item.name}
      aria-label={`${item.name}, ${range}, ${occupancy}${status ? `, ${status}` : ""}`}
      className="absolute z-10 overflow-hidden rounded-md ring-1 ring-foreground/10 transition-transform duration-150 ease-out active:scale-[0.97]"
      style={{ top, height, left: BLOCK_INSET, width }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-black/55 px-1 py-0.5 text-center text-white">
        <span className={`tabular-nums ${text}`}>{occupancy}</span>
        {status ? <span className={`truncate ${text}`}>{status}</span> : null}
      </span>
    </Link>
  );
}
