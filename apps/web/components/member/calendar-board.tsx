"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { openingIntervalsForDate, type BoxHoursConfig } from "@78feet/domain";
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
import { KindTabs, chipClass, type KindView } from "@/components/member/kind-tabs";
import { ModuleBody, ModuleHeader, ModulePage, moduleContentInset } from "@/components/member/module-page";
import { cn } from "cn";
import { closedTimeBands } from "@/lib/box/time-bands";

const DENSITY_KEY = "78feet.calendario.densidad";
const DENSITY_CHANGE_EVENT = "78feet:calendario-densidad";
const DESKTOP_QUERY = "(min-width: 768px)";
const STAFF_DAY_COLUMN_PX = 136;
type Density = "pequeno" | "mediano" | "grande";
const PX_BY_DENSITY: Record<Density, number> = {
  pequeno: PX_PER_HOUR,
  mediano: PX_PER_HOUR_MEDIUM,
  grande: PX_PER_HOUR_LARGE,
};
type CalendarView = KindView;

function subscribeDesktop(callback: () => void): () => void {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function subscribeDensity(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(DENSITY_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DENSITY_CHANGE_EVENT, callback);
  };
}

function getDensitySnapshot(): Density {
  const stored = window.localStorage.getItem(DENSITY_KEY);
  return stored === "mediano" || stored === "grande" ? stored : "pequeno";
}

function saveDensity(next: Density): void {
  window.localStorage.setItem(DENSITY_KEY, next);
  window.dispatchEvent(new Event(DENSITY_CHANGE_EVENT));
}

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
  const desktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false);
  const density = useSyncExternalStore<Density>(subscribeDensity, getDensitySnapshot, () => "pequeno");

  function choose(next: Density) {
    saveDensity(next);
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
  openingHours,
  title = "Calendario",
  basePath = "/calendario",
  classHrefPrefix = "/clases",
  emptyDirected = "No hay clases dirigidas esta semana.",
  emptyOpen = "No hay opens esta semana.",
  variant = "member",
  description,
}: {
  view: CalendarView;
  semana: string | undefined;
  today: string;
  week: WeekNav;
  days: string[];
  classes: CalendarClass[];
  hours?: CalendarHours;
  openingHours?: BoxHoursConfig;
  title?: string;
  basePath?: string;
  classHrefPrefix?: string;
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
      emptyDirected={emptyDirected}
      emptyOpen={emptyOpen}
    />
  );
}

type CalendarBoardCoreProps = {
  view: CalendarView;
  semana: string | undefined;
  today: string;
  week: WeekNav;
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

function StaffCalendarBoard({
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

function MemberCalendarBoard({
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

function WeekNav({
  basePath,
  view,
  week,
  align,
  width = "content",
}: {
  basePath: string;
  view: CalendarView;
  week: WeekNav;
  align?: "start" | "center";
  width?: "content" | "calendar";
}) {
  const navLink =
    "flex min-h-8 shrink-0 items-center rounded-sm px-2 text-sm text-primary transition-transform duration-150 ease-out active:scale-[0.97]";
  const navDisabled = "flex min-h-8 shrink-0 items-center rounded-sm px-2 text-sm text-muted-foreground";

  const chips = (
    <div className="flex gap-1 rounded-md bg-muted p-0.5">
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
                ? "flex min-h-8 shrink-0 touch-manipulation flex-col items-center justify-center rounded-sm bg-card px-2 text-xs leading-tight font-semibold text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
                : "flex min-h-8 shrink-0 touch-manipulation flex-col items-center justify-center rounded-sm px-2 text-xs leading-tight text-muted-foreground transition-transform duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
            }
          >
            <span className="tabular-nums">{chip.day}</span>
            <span>{chip.month}</span>
          </Link>
        );
      })}
    </div>
  );

  if (width === "calendar") {
    return (
      <nav
        aria-label="Semanas"
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1"
      >
        {week.canPrev ? (
          <Link href={calendarHref(basePath, week.prev, view)} prefetch={true} className={navLink}>
            Anterior
          </Link>
        ) : (
          <span className={navDisabled}>Anterior</span>
        )}
        <div className="flex min-w-0 justify-center overflow-x-auto px-1">{chips}</div>
        {week.canNext ? (
          <Link
            href={calendarHref(basePath, week.next, view)}
            prefetch={true}
            className={cn(navLink, "justify-self-end")}
          >
            Siguiente
          </Link>
        ) : (
          <span className={cn(navDisabled, "justify-self-end")}>Siguiente</span>
        )}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Semanas"
      className={cn(
        "flex max-w-full min-w-0 flex-wrap items-center gap-2",
        align === "center" ? "mx-auto w-fit" : "w-fit self-start",
      )}
    >
      {week.canPrev ? (
        <Link href={calendarHref(basePath, week.prev, view)} prefetch={true} className={navLink}>
          Anterior
        </Link>
      ) : (
        <span className={navDisabled}>Anterior</span>
      )}
      <div className="flex min-w-0 max-w-[min(100%,20rem)] overflow-x-auto sm:max-w-none">{chips}</div>
      {week.canNext ? (
        <Link href={calendarHref(basePath, week.next, view)} prefetch={true} className={navLink}>
          Siguiente
        </Link>
      ) : (
        <span className={navDisabled}>Siguiente</span>
      )}
    </nav>
  );
}

function CalendarGrid({
  days,
  today,
  classes,
  openingHours,
  axis,
  height,
  pxPerHour,
  dayColumnPx,
  timeColumn,
  classHrefPrefix,
  blockWidth,
  minBlockHeight,
  textClass,
}: {
  days: string[];
  today: string;
  classes: CalendarClass[];
  openingHours?: BoxHoursConfig;
  axis: ReturnType<typeof calendarAxis>;
  height: number;
  pxPerHour: number;
  dayColumnPx: number;
  timeColumn: string;
  classHrefPrefix: string;
  blockWidth: number;
  minBlockHeight: number;
  textClass: string;
}) {
  return (
    <div
      className="grid h-max w-max"
      style={{ gridTemplateColumns: `${timeColumn} repeat(${days.length}, ${dayColumnPx}px)` }}
    >
      <div className="sticky top-0 left-0 z-30 border-b border-border bg-background px-2 py-2 text-center text-xs font-medium">
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
                ? "sticky top-0 z-20 border-b border-border bg-background px-2 py-2 text-center text-xs font-semibold text-primary"
                : isPast
                  ? "sticky top-0 z-20 border-b border-border bg-background px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                  : "sticky top-0 z-20 border-b border-border bg-background px-2 py-2 text-center text-xs font-medium"
            }
          >
            <span className="block truncate">{formatWeekday(date)}</span>
            <span className="block tabular-nums">{formatDayNumber(date)}</span>
          </div>
        );
      })}
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
          className={cn("relative border-l border-border", date === today && "bg-primary/5")}
          style={{ height }}
        >
          {openingHours ? (
            <ClosedBands
              bands={closedTimeBands(openingIntervalsForDate(openingHours, date), axis.axisStart, axis.axisEnd)}
              axisStart={axis.axisStart}
              pxPerHour={pxPerHour}
            />
          ) : null}
          <GridLines ticks={axis.ticks} axisStart={axis.axisStart} pxPerHour={pxPerHour} />
          {classes
            .filter((item) => item.date === date)
            .map((item) => {
              const box = blockBox(item, axis.axisStart, pxPerHour);
              return (
                <ClassBlock
                  key={item.id}
                  item={item}
                  href={`${classHrefPrefix}/${item.id}`}
                  text={textClass}
                  top={box.top + BLOCK_INSET}
                  height={Math.max(box.height - BLOCK_INSET * 2, minBlockHeight)}
                  width={blockWidth}
                />
              );
            })}
        </div>
      ))}
    </div>
  );
}

function ClosedBands({
  bands,
  axisStart,
  pxPerHour,
}: {
  bands: ReturnType<typeof closedTimeBands>;
  axisStart: number;
  pxPerHour: number;
}) {
  return bands.map((band) => {
    const top = ((band.start - axisStart) / 60) * pxPerHour;
    const height = ((band.end - band.start) / 60) * pxPerHour;
    return (
      <div
        key={`${band.start}-${band.end}`}
        role="note"
        aria-label={band.label}
        className="pointer-events-none absolute inset-x-0 z-[2] flex items-center justify-center bg-muted/40 px-1 text-center text-xs font-medium text-muted-foreground"
        style={{
          top,
          height,
          backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, var(--color-border) 6px 7px, transparent 7px 13px)",
        }}
      >
        {height >= pxPerHour * 0.8 ? <span className="rounded-sm bg-background/80 px-1">Cerrado</span> : null}
      </div>
    );
  });
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
  const cancelled = item.status === "cancelled";
  const exception = item.isException;
  const occupancy = `${item.bookedCount}/${item.capacity}`;
  const range = `${formatTime(new Date(item.startAt))}–${formatTime(new Date(item.endAt))}`;
  const booked = !cancelled && item.bookedByMe ? "Apuntado" : "";
  const exceptionNote = exception ? ", excepción" : "";
  const ariaLabel = cancelled
    ? `${item.name}, ${range}, Cancelada${exceptionNote}`
    : `${item.name}, ${range}, ${occupancy}${booked ? `, ${booked}` : ""}${exceptionNote}`;

  return (
    <Link
      href={href}
      prefetch={true}
      title={item.name}
      aria-label={ariaLabel}
      className={
        cancelled
          ? "absolute z-10 overflow-hidden rounded-md ring-2 ring-destructive/70 transition-transform duration-150 ease-out active:scale-[0.97]"
          : "absolute z-10 overflow-hidden rounded-md ring-1 ring-foreground/10 transition-transform duration-150 ease-out active:scale-[0.97]"
      }
      style={{ top, height, left: BLOCK_INSET, width }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageUrl}
        alt=""
        className={cancelled ? "absolute inset-0 size-full object-cover opacity-40 saturate-50" : "absolute inset-0 size-full object-cover"}
      />
      {exception ? (
        <span
          className="absolute top-0.5 left-0.5 z-20 text-base font-bold leading-none text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
          aria-hidden
        >
          *
        </span>
      ) : null}
      {cancelled ? (
        <span className="absolute inset-0 flex items-center justify-center bg-destructive/80 px-1 text-center font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          <span className={text}>Cancelada</span>
        </span>
      ) : (
        <span className="absolute inset-x-0 bottom-0 flex flex-col items-center px-1 pb-0.5 text-center text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
          <span className={`tabular-nums ${text}`}>{occupancy}</span>
          {booked ? <span className={`truncate ${text}`}>{booked}</span> : null}
        </span>
      )}
    </Link>
  );
}
