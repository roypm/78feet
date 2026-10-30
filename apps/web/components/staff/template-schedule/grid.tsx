"use client";

import { ResourceImage } from "@/components/feedback/resource-image";

import { EmptyState } from "@/components/feedback/empty-state";

import type { MouseEvent } from "react";
import { clockToMinutes, type BoxHoursConfig } from "@78feet/domain";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ModulePrimaryAction } from "@/components/member/module-page";
import { BLOCK_INSET, clockLabel } from "@/lib/box/calendar-layout";
import { PX_PER_HOUR } from "@/lib/box/column";
import type { ScheduleTemplate } from "@/lib/box/template-draft";
import { templateAxis, templateBlockBox } from "@/lib/box/template-layout";
import { closedTimeBands } from "@/lib/box/time-bands";
import { DAYS, SHORT_DAYS, type TemplateKind, type ClassType, type Coach } from "./shared";

export function TemplateKindPanel({
  className,
  kind,
  working,
  types,
  coaches,
  openingHours,
  canWrite,
  mobileDay,
  onMobileDayChange,
  axis,
  height,
  onCreate,
  onEdit,
  onAdd,
}: {
  className?: string;
  kind: TemplateKind;
  working: ScheduleTemplate[];
  types: ClassType[];
  coaches: Coach[];
  openingHours: BoxHoursConfig;
  canWrite: boolean;
  mobileDay: number;
  onMobileDayChange: (day: number) => void;
  axis: ReturnType<typeof templateAxis>;
  height: number;
  onCreate: (event: MouseEvent<HTMLDivElement>, weekday: number, kind: TemplateKind) => void;
  onEdit: (template: ScheduleTemplate) => void;
  onAdd: () => void;
}) {
  const kindsWorking = working.filter((item) => item.kind === kind);
  const typesForKind = types.filter((item) => item.kind === kind);

  return (
    <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-3", className)}>
      {canWrite && typesForKind.length > 0 ? (
        <ModulePrimaryAction>
          <Button type="button" variant="outline" className="min-h-11" onClick={onAdd}>
            Añadir hueco
          </Button>
        </ModulePrimaryAction>
      ) : null}

      {typesForKind.length === 0 ? (
        <EmptyState compact title={kind === "open" ? "No hay tipos Open" : "No hay tipos dirigidos"} description={canWrite ? "Creá un tipo de esta grilla para añadir huecos." : "Pedile al admin que configure los tipos de esta grilla."} href={canWrite ? "/staff/tipos" : undefined} action="Crear tipo" />
      ) : (
        <>
          {kindsWorking.length === 0 && <EmptyState compact title="Esta grilla todavía no tiene huecos" description={canWrite ? "Usá Añadir hueco o elegí un espacio abierto. Los cambios quedan en borrador hasta aplicar la plantilla." : "El admin todavía no ha añadido huecos a esta grilla."} />}
          <p className="text-xs text-muted-foreground">Las franjas tramadas indican que el box está cerrado; no se pueden añadir clases ahí.</p>
          <div className="flex gap-1 overflow-x-auto pb-1 md:hidden" role="tablist" aria-label="Día de la plantilla">
            {DAYS.map((day, index) => {
              const weekday = index + 1;
              const active = weekday === mobileDay;
              return (
                <Button
                  key={`${kind}-${day}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className="min-h-11 min-w-11"
                  onClick={() => onMobileDayChange(weekday)}
                >
                  {SHORT_DAYS[index]}
                </Button>
              );
            })}
          </div>

          <div className="min-h-[20rem] flex-1 w-fit max-w-full self-start overflow-auto overscroll-contain rounded-lg border border-border bg-background">
            <div
              className="hidden h-max w-max md:grid"
              style={{ gridTemplateColumns: `4rem repeat(7, 136px)` }}
            >
              <GridHeader label="Hora" />
              {DAYS.map((day) => (
                <GridHeader key={`${kind}-${day}`} label={day} />
              ))}
              <TimeAxis axis={axis} height={height} />
              {DAYS.map((day, index) => (
                <DayTrack
                  key={`${kind}-${day}`}
                  weekday={index + 1}
                  templates={kindsWorking.filter((template) => template.weekday === index + 1)}
                  intervals={openingHours.weekly.find((day) => day.weekday === index + 1)?.intervals ?? []}
                  coaches={coaches}
                  ticks={axis.ticks}
                  axisStart={axis.axisStart}
                  height={height}
                  canWrite={canWrite}
                  kind={kind}
                  onCreate={onCreate}
                  onEdit={onEdit}
                />
              ))}
            </div>

            <div
              className="grid h-max w-max md:hidden"
              style={{ gridTemplateColumns: "4rem minmax(14rem, calc(100vw - 6rem))" }}
            >
              <GridHeader label="Hora" />
              <GridHeader label={DAYS[mobileDay - 1]} />
              <TimeAxis axis={axis} height={height} />
              <DayTrack
                weekday={mobileDay}
                templates={kindsWorking.filter((template) => template.weekday === mobileDay)}
                intervals={openingHours.weekly.find((day) => day.weekday === mobileDay)?.intervals ?? []}
                coaches={coaches}
                ticks={axis.ticks}
                axisStart={axis.axisStart}
                height={height}
                canWrite={canWrite}
                kind={kind}
                onCreate={onCreate}
                onEdit={onEdit}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function GridHeader({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background px-2 py-2 text-center text-xs font-medium">
      {label}
    </div>
  );
}

function TimeAxis({
  axis,
  height,
}: {
  axis: ReturnType<typeof templateAxis>;
  height: number;
}) {
  return (
    <div className="sticky left-0 z-20 border-r border-border bg-background" style={{ height }}>
      <GridLines ticks={axis.ticks} axisStart={axis.axisStart} />
      {axis.hours.map((minutes, index) => (
        <span
          key={minutes}
          className="absolute right-1 z-10 text-xs text-muted-foreground tabular-nums"
          style={{ top: index === axis.hours.length - 1 ? Math.max(0, ((minutes - axis.axisStart) / 60) * PX_PER_HOUR - 16) : ((minutes - axis.axisStart) / 60) * PX_PER_HOUR }}
        >
          {clockLabel(minutes)}
        </span>
      ))}
    </div>
  );
}

function DayTrack({
  weekday,
  templates,
  intervals,
  coaches,
  ticks,
  axisStart,
  height,
  canWrite,
  kind,
  onCreate,
  onEdit,
}: {
  weekday: number;
  templates: ScheduleTemplate[];
  intervals: { openTime: string; closeTime: string }[];
  coaches: Coach[];
  ticks: number[];
  axisStart: number;
  height: number;
  canWrite: boolean;
  kind: TemplateKind;
  onCreate: (event: MouseEvent<HTMLDivElement>, weekday: number, kind: TemplateKind) => void;
  onEdit: (template: ScheduleTemplate) => void;
}) {
  function handleCreate(event: MouseEvent<HTMLDivElement>) {
    if (!canWrite) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const minute = axisStart + ((event.clientY - bounds.top) / PX_PER_HOUR) * 60;
    const open = intervals.some(
      (interval) => clockToMinutes(interval.openTime) <= minute && minute < clockToMinutes(interval.closeTime),
    );
    if (open) onCreate(event, weekday, kind);
    else toast.error("El box está cerrado en ese tramo");
  }

  const bands = closedTimeBands(intervals, axisStart, axisStart + (height / PX_PER_HOUR) * 60);

  return (
    <div
      className={cn("relative border-l border-border", canWrite && "cursor-pointer pointer-hover:bg-muted/20")}
      style={{ height }}
      onClick={handleCreate}
      aria-label={DAYS[weekday - 1]}
    >
      {bands.map((band) => {
        const top = ((band.start - axisStart) / 60) * PX_PER_HOUR;
        const bandHeight = ((band.end - band.start) / 60) * PX_PER_HOUR;
        return (
          <div
            key={`${band.start}-${band.end}`}
            role="note"
            aria-label={band.label}
            className="absolute inset-x-0 z-[2] flex cursor-default items-center justify-center bg-muted/40 px-1 text-center text-xs font-medium text-muted-foreground"
            onClick={(event) => event.stopPropagation()}
            style={{
              top,
              height: bandHeight,
              backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, var(--color-border) 6px 7px, transparent 7px 13px)",
            }}
          >
            {bandHeight >= PX_PER_HOUR * 0.8 ? <span className="rounded-sm bg-background/80 px-1">Cerrado</span> : null}
          </div>
        );
      })}
      <GridLines ticks={ticks} axisStart={axisStart} />
      {templates.map((template) => {
        const box = templateBlockBox(template, axisStart, PX_PER_HOUR);
        const coach = coaches.find((item) => item.id === template.coachId)?.name;
        const details = `${template.classTypeName}, ${template.startTime}–${template.endTime}, ${template.defaultCapacity} plazas${coach ? `, ${coach}` : ", sin coach"}`;
        const classNames = cn("absolute z-10 overflow-hidden rounded-md ring-1 ring-foreground/15", canWrite && "transition-[scale,box-shadow] duration-150 ease-out active:scale-[0.97] pointer-hover:ring-2 pointer-hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary");
        const style = {
          top: box.top + BLOCK_INSET,
          height: Math.max(box.height - BLOCK_INSET * 2, 56),
          left: BLOCK_INSET,
          right: BLOCK_INSET,
        };
        const contents = (
          <>
                        <ResourceImage src={template.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 flex justify-center px-1 pb-0.5 text-center leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
              <span className="truncate text-xs font-medium tabular-nums">
                {template.defaultCapacity} plazas{coach ? ` · ${coach}` : ""}
              </span>
            </span>
          </>
        );

        if (!canWrite) {
          return (
            <div key={template.id} title={details} aria-label={details} className={classNames} style={style}>
              {contents}
            </div>
          );
        }

        return (
          <button
            key={template.id}
            type="button"
            title={details}
            aria-label={`Editar ${details}`}
            className={classNames}
            style={style}
            onClick={(event) => {
              event.stopPropagation();
              onEdit(template);
            }}
          >
            {contents}
          </button>
        );
      })}
    </div>
  );
}

function GridLines({ ticks, axisStart }: { ticks: number[]; axisStart: number }) {
  return ticks.map((minutes) => (
    <span
      key={minutes}
      aria-hidden
      className={
        minutes % 60 === 0
          ? "pointer-events-none absolute inset-x-0 z-[1] border-t border-foreground/30"
          : "pointer-events-none absolute inset-x-0 border-t border-foreground/10"
      }
      style={{ top: ((minutes - axisStart) / 60) * PX_PER_HOUR }}
    />
  ));
}
