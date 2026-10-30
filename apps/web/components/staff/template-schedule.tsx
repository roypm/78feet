"use client";

import { useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { clockToMinutes, isWithinOpeningIntervals, localDateString, nextMondayDate, type BoxHoursConfig } from "@78feet/domain";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import { api } from "@/lib/box/api";
import { BLOCK_INSET, clockLabel } from "@/lib/box/calendar-layout";
import { PX_PER_HOUR } from "@/lib/box/column";
import { formatDay } from "@/lib/box/format";
import type { KindView } from "@/lib/box/day-groups";
import {
  diffTemplates,
  localTemplateOverlap,
  newPendingTemplateId,
  templatesEqual,
  templatesSnapshot,
  type ScheduleTemplate,
  type TemplateSlotWrite,
} from "@/lib/box/template-draft";
import { templateAxis, templateBlockBox, type TemplateHours } from "@/lib/box/template-layout";
import { closedTimeBands } from "@/lib/box/time-bands";
import { cn } from "cn";
import { moduleContentInset, ModulePrimaryAction } from "@/components/member/module-page";

type TemplateKind = "directed" | "open";

function kindFromView(view: KindView): TemplateKind {
  return view === "open" ? "open" : "directed";
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const SHORT_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type ClassType = { id: string; name: string; kind: "directed" | "open"; imageUrl: string };
type Coach = { id: string; name: string };
type Summary = { cancelledClassCount: number; cancelledBookingCount: number; movedBookingCount: number };
type Draft = {
  key: number;
  kind: TemplateKind;
  template?: ScheduleTemplate;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  coachId: string | null;
  defaultCapacity: number;
};

function minutesToClock(minutes: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 45, minutes));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function summaryMessage(summary: Summary): string {
  const changes = [
    summary.cancelledClassCount ? `${summary.cancelledClassCount} clases canceladas` : null,
    summary.cancelledBookingCount ? `${summary.cancelledBookingCount} reservas canceladas` : null,
    summary.movedBookingCount ? `${summary.movedBookingCount} reservas movidas` : null,
  ].filter((item): item is string => item !== null);

  return changes.length ? `Plantilla actualizada. ${changes.join(" · ")}.` : "Plantilla actualizada.";
}

function mergeSummary(left: Summary, right: Summary): Summary {
  return {
    cancelledClassCount: left.cancelledClassCount + right.cancelledClassCount,
    cancelledBookingCount: left.cancelledBookingCount + right.cancelledBookingCount,
    movedBookingCount: left.movedBookingCount + right.movedBookingCount,
  };
}

function slotBody(slot: TemplateSlotWrite) {
  return {
    weekday: slot.weekday,
    startTime: slot.startTime.slice(0, 5),
    endTime: slot.endTime.slice(0, 5),
    classTypeId: slot.classTypeId,
    coachId: slot.coachId,
    defaultCapacity: slot.defaultCapacity,
  };
}

export function TemplateSchedule({
  view,
  templates,
  types,
  coaches,
  hours,
  openingHours,
  canWrite,
}: {
  view: KindView;
  templates: ScheduleTemplate[];
  types: ClassType[];
  coaches: Coach[];
  hours: TemplateHours;
  openingHours: BoxHoursConfig;
  canWrite: boolean;
}) {
  const router = useRouter();
  const baseline = useMemo(() => templatesSnapshot(templates), [templates]);
  const baselineKey = JSON.stringify(baseline);
  const [workingState, setWorkingState] = useState(() => ({
    baselineKey,
    value: templatesSnapshot(templates),
  }));
  const working = workingState.baselineKey === baselineKey ? workingState.value : baseline;
  const [mobileDay, setMobileDay] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const editorKey = useRef(0);

  function setWorking(next: ScheduleTemplate[] | ((current: ScheduleTemplate[]) => ScheduleTemplate[])) {
    setWorkingState((previous) => {
      const current = previous.baselineKey === baselineKey ? previous.value : baseline;
      return {
        baselineKey,
        value: typeof next === "function" ? next(current) : next,
      };
    });
  }

  const isDirty = !templatesEqual(baseline, working);
  const effectiveFrom = formatDay(nextMondayDate(localDateString(new Date())));

  function axisForKind(kind: TemplateKind) {
    return templateAxis(
      working.filter((item) => item.kind === kind),
      hours,
    );
  }

  function heightForKind(kind: TemplateKind) {
    const axis = axisForKind(kind);
    return ((axis.axisEnd - axis.axisStart) / 60) * PX_PER_HOUR;
  }

  const activeKind = kindFromView(view);

  function startCreate(weekday: number, kind: TemplateKind, requestedStart?: number) {
    const typesForKind = types.filter((item) => item.kind === kind);
    let start = Math.min(22 * 60 + 45, Math.max(0, Math.round((requestedStart ?? 18 * 60) / 15) * 15));
    const intervals = openingHours.weekly.find((day) => day.weekday === weekday)?.intervals ?? [];
    const fits = (minute: number) =>
      intervals.some((interval) => clockToMinutes(interval.openTime) <= minute && minute + 60 <= clockToMinutes(interval.closeTime));
    if (!fits(start) && requestedStart === undefined) {
      const firstUsable = intervals.find((interval) => clockToMinutes(interval.closeTime) - clockToMinutes(interval.openTime) >= 60);
      if (!firstUsable) {
        toast.error("Ese día no tiene un tramo abierto suficiente para una clase");
        return;
      }
      start = clockToMinutes(firstUsable.openTime);
    }
    if (!fits(start)) {
      toast.error("No hay una hora abierta suficiente para una clase en ese tramo");
      return;
    }
    const end = start + 60;
    setDraft({
      key: ++editorKey.current,
      kind,
      weekday,
      startTime: minutesToClock(start),
      endTime: minutesToClock(end),
      classTypeId: typesForKind[0]?.id ?? "",
      coachId: null,
      defaultCapacity: 12,
    });
  }

  function startEdit(template: ScheduleTemplate) {
    setDraft({
      key: ++editorKey.current,
      kind: template.kind,
      template,
      weekday: template.weekday,
      startTime: template.startTime.slice(0, 5),
      endTime: template.endTime.slice(0, 5),
      classTypeId: template.classTypeId,
      coachId: template.coachId,
      defaultCapacity: template.defaultCapacity,
    });
    setMobileDay(template.weekday);
  }

  function startFromGrid(event: MouseEvent<HTMLDivElement>, weekday: number, kind: TemplateKind) {
    if (!canWrite) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const requestedStart = axisForKind(kind).axisStart + ((event.clientY - bounds.top) / PX_PER_HOUR) * 60;
    const start = Math.min(22 * 60 + 45, Math.max(0, Math.round(requestedStart / 15) * 15));
    startCreate(weekday, kind, start);
  }

  function cancelDraftChanges() {
    setWorking(templatesSnapshot(baseline));
    setDraft(null);
    toast.message("Cambios descartados");
  }

  function commitSlot(slot: TemplateSlotWrite, existing?: ScheduleTemplate) {
    const type = types.find((item) => item.id === slot.classTypeId);
    if (!type) {
      toast.error("Elegí un tipo de clase");
      return;
    }
    const opening = openingHours.weekly.find((day) => day.weekday === slot.weekday)?.intervals ?? [];
    if (!isWithinOpeningIntervals(opening, slot.startTime, slot.endTime)) {
      toast.error("La clase tiene que quedar dentro del horario abierto de ese día");
      return;
    }
    const id = existing?.id ?? newPendingTemplateId();
    if (
      localTemplateOverlap(
        { ...slot, id, kind: type.kind },
        working.filter((item) => item.id !== id),
      )
    ) {
      const lane = type.kind === "open" ? "open" : "clase dirigida";
      toast.error(`Esa hora se solapa con otro ${lane} del mismo día`);
      return;
    }
    const next: ScheduleTemplate = {
      id,
      weekday: slot.weekday,
      startTime: slot.startTime.slice(0, 5),
      endTime: slot.endTime.slice(0, 5),
      classTypeId: slot.classTypeId,
      kind: type.kind,
      classTypeName: type.name,
      imageUrl: type.imageUrl,
      defaultCapacity: slot.defaultCapacity,
      coachId: slot.coachId,
    };
    setWorking((prev) => [...prev.filter((item) => item.id !== id), next]);
    setDraft(null);
  }

  function removeSlot(id: string) {
    setWorking((prev) => prev.filter((item) => item.id !== id));
    setDraft(null);
  }

  async function applyTemplate() {
    const { deletedIds, created, updated } = diffTemplates(baseline, working);
    setApplying(true);
    let summary: Summary = { cancelledClassCount: 0, cancelledBookingCount: 0, movedBookingCount: 0 };
    try {
      for (const id of deletedIds) {
        const result = await api<{ summary: Summary }>(`/api/v1/admin/templates/${id}`, { method: "DELETE" });
        summary = mergeSummary(summary, result.summary);
      }
      for (const slot of updated) {
        const result = await api<{ summary: Summary }>(`/api/v1/admin/templates/${slot.id}`, {
          method: "PATCH",
          body: JSON.stringify(slotBody(slot)),
        });
        summary = mergeSummary(summary, result.summary);
      }
      for (const slot of created) {
        await api("/api/v1/admin/templates", { method: "POST", body: JSON.stringify(slotBody(slot)) });
      }
      toast.success(summaryMessage(summary));
      setApplyOpen(false);
      setDraft(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aplicar la plantilla");
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className={cn("flex min-h-0 flex-1 flex-col gap-3", moduleContentInset)}>
      {canWrite && isDirty ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={cancelDraftChanges}>
            Cancelar cambio
          </Button>
          <Button type="button" className="min-h-11" onClick={() => setApplyOpen(true)}>
            Aplicar plantilla
          </Button>
        </div>
      ) : null}

      {canWrite && isDirty ? (
        <p className="text-sm text-muted-foreground">Hay cambios sin aplicar en la plantilla.</p>
      ) : null}

      <ApplyTemplateDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        effectiveFrom={effectiveFrom}
        pending={applying}
        onConfirm={() => void applyTemplate()}
      />

      {draft ? (
        <TemplateEditor
          key={draft.key}
          draft={draft}
          types={types.filter((item) => item.kind === draft.kind)}
          coaches={coaches}
          onClose={() => setDraft(null)}
          onCommit={commitSlot}
          onRemove={removeSlot}
        />
      ) : null}

      {types.length === 0 ? (
        <p className="rounded-lg bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Primero creá un tipo de clase para poder añadirlo a la plantilla.
        </p>
      ) : (
        <TemplateKindPanel
          className="min-h-0 flex-1"
          kind={activeKind}
          working={working}
          types={types}
          coaches={coaches}
          openingHours={openingHours}
          canWrite={canWrite}
          mobileDay={mobileDay}
          onMobileDayChange={setMobileDay}
          axis={axisForKind(activeKind)}
          height={heightForKind(activeKind)}
          onCreate={startFromGrid}
          onEdit={startEdit}
          onAdd={() => startCreate(mobileDay, activeKind)}
        />
      )}

    </section>
  );
}

function TemplateKindPanel({
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
        <p className="rounded-lg bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          No hay tipos {kind === "open" ? "Open" : "dirigidos"}. Creá uno en tipos de clase.
        </p>
      ) : (
        <>
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
      className={`relative border-l border-border ${canWrite ? "cursor-pointer" : ""}`}
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
            className="pointer-events-none absolute inset-x-0 z-[2] flex items-center justify-center bg-muted/40 px-1 text-center text-xs font-medium text-muted-foreground"
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
        const classNames = "absolute z-10 overflow-hidden rounded-md ring-1 ring-foreground/15 transition-transform duration-150 ease-out active:scale-[0.97]";
        const style = {
          top: box.top + BLOCK_INSET,
          height: Math.max(box.height - BLOCK_INSET * 2, 56),
          left: BLOCK_INSET,
          right: BLOCK_INSET,
        };
        const contents = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={template.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
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

function ApplyTemplateDialog({
  open,
  onOpenChange,
  effectiveFrom,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  effectiveFrom: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Aplicar plantilla?</DialogTitle>
          <DialogDescription>
            Los cambios rigen desde el {effectiveFrom}. La semana en curso no se toca. Las clases futuras del horario se
            actualizarán; si cambia la hora, el tipo o desaparece un hueco, las reservas pueden cancelarse o moverse. Bajar
            el aforo por debajo de los apuntados cancela todas las reservas de esa clase. Las excepciones ya hechas en
            instancias concretas no se sobrescriben.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
            Volver
          </DialogClose>
          <Button type="button" className="min-h-11" disabled={pending} onClick={onConfirm}>
            {pending ? "Aplicando…" : "Aplicar plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({
  draft,
  types,
  coaches,
  onClose,
  onCommit,
  onRemove,
}: {
  draft: Draft;
  types: ClassType[];
  coaches: Coach[];
  onClose: () => void;
  onCommit: (slot: TemplateSlotWrite, existing?: ScheduleTemplate) => void;
  onRemove: (id: string) => void;
}) {
  const isEditing = Boolean(draft.template);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCommit(
      {
        weekday: Number(form.get("weekday")),
        startTime: String(form.get("startTime")),
        endTime: String(form.get("endTime")),
        classTypeId: String(form.get("classTypeId")),
        coachId: String(form.get("coachId") || "") || null,
        defaultCapacity: Number(form.get("defaultCapacity")),
      },
      draft.template,
    );
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      wide
      title={isEditing ? "Editar hueco" : "Nuevo hueco"}
      description="El cambio se guarda en el borrador. Usá «Aplicar plantilla» para publicarlo desde el próximo lunes."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Día">
            <select name="weekday" required className={controlClass} defaultValue={draft.weekday}>
              {DAYS.map((day, index) => (
                <option key={day} value={index + 1}>{day}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select name="classTypeId" required className={controlClass} defaultValue={draft.classTypeId || types[0]?.id}>
              {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </Field>
          <Field label="Inicio">
            <Input name="startTime" type="time" required defaultValue={draft.startTime} />
          </Field>
          <Field label="Fin">
            <Input name="endTime" type="time" required defaultValue={draft.endTime} />
          </Field>
          <Field label="Coach">
            <select name="coachId" className={controlClass} defaultValue={draft.coachId ?? ""}>
              <option value="">Sin coach</option>
              {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
            </select>
          </Field>
          <Field label="Aforo">
            <Input name="defaultCapacity" type="number" min={1} required defaultValue={draft.defaultCapacity} />
          </Field>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
            Cerrar
          </Button>
          {draft.template ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={() => onRemove(draft.template!.id)}
            >
              Quitar hueco
            </Button>
          ) : null}
          <Button type="submit" className="min-h-11">
            {isEditing ? "Guardar en borrador" : "Añadir al borrador"}
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}
