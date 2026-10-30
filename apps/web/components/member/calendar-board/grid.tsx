"use client";

import { openingIntervalsForDate, type BoxHoursConfig } from "@78feet/domain";
import { cn } from "cn";
import type { CalendarClass } from "@/lib/box/calendar";
import { BLOCK_INSET, blockBox, calendarAxis, clockLabel } from "@/lib/box/calendar-layout";
import { formatDayNumber, formatWeekday } from "@/lib/box/format";
import { closedTimeBands } from "@/lib/box/time-bands";
import { ClassBlock } from "./class-block";

export function CalendarGrid({
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
