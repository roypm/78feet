"use client";

import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import { api } from "@/lib/box/api";
import { BLOCK_INSET, clockLabel } from "@/lib/box/calendar-layout";
import { PX_PER_HOUR } from "@/lib/box/column";
import { templateAxis, templateBlockBox, type TemplateHours } from "@/lib/box/template-layout";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const SHORT_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type ClassType = { id: string; name: string; kind: "directed" | "open"; imageUrl: string };
type Template = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  classTypeName: string;
  imageUrl: string;
  defaultCapacity: number;
  coachId: string | null;
};
type Coach = { id: string; name: string };
type Summary = { cancelledClassCount: number; cancelledBookingCount: number; movedBookingCount: number };
type Draft = {
  key: number;
  template?: Template;
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

export function TemplateSchedule({
  templates,
  types,
  coaches,
  hours,
  canWrite,
}: {
  templates: Template[];
  types: ClassType[];
  coaches: Coach[];
  hours: TemplateHours;
  canWrite: boolean;
}) {
  const [mobileDay, setMobileDay] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const editorKey = useRef(0);
  const axis = templateAxis(templates, hours);
  const height = ((axis.axisEnd - axis.axisStart) / 60) * PX_PER_HOUR;

  function startCreate(weekday: number, requestedStart = 18 * 60) {
    const start = Math.min(22 * 60 + 45, Math.max(0, Math.round(requestedStart / 15) * 15));
    const end = start + 60;
    setDraft({
      key: ++editorKey.current,
      weekday,
      startTime: minutesToClock(start),
      endTime: minutesToClock(end),
      classTypeId: types[0]?.id ?? "",
      coachId: null,
      defaultCapacity: 12,
    });
  }

  function startEdit(template: Template) {
    setDraft({
      key: ++editorKey.current,
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

  function startFromGrid(event: MouseEvent<HTMLDivElement>, weekday: number) {
    if (!canWrite) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const requestedStart = axis.axisStart + ((event.clientY - bounds.top) / PX_PER_HOUR) * 60;
    startCreate(weekday, requestedStart);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Plantilla semanal</h2>
          <p className="text-sm text-muted-foreground">
            Horario recurrente. Los cambios rigen desde el lunes siguiente.
          </p>
        </div>
        {canWrite && types.length > 0 ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => startCreate(mobileDay)}>
            Añadir hueco
          </Button>
        ) : null}
      </div>

      {draft ? (
        <TemplateEditor
          key={draft.key}
          draft={draft}
          types={types}
          coaches={coaches}
          onClose={() => setDraft(null)}
        />
      ) : null}

      {types.length === 0 ? (
        <p className="rounded-lg bg-card p-4 text-sm text-muted-foreground ring-1 ring-foreground/10">
          Primero creá un tipo de clase para poder añadirlo a la plantilla.
        </p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1 md:hidden" role="tablist" aria-label="Día de la plantilla">
            {DAYS.map((day, index) => {
              const weekday = index + 1;
              const active = weekday === mobileDay;
              return (
                <Button
                  key={day}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className="min-h-11 min-w-11"
                  onClick={() => setMobileDay(weekday)}
                >
                  {SHORT_DAYS[index]}
                </Button>
              );
            })}
          </div>

          <div className="max-h-[70dvh] min-h-[20rem] overflow-auto overscroll-contain rounded-lg border border-border bg-background">
            <div
              className="hidden h-max w-max md:grid"
              style={{ gridTemplateColumns: `4rem repeat(7, 136px)` }}
            >
              <GridHeader label="Hora" />
              {DAYS.map((day) => (
                <GridHeader key={day} label={day} />
              ))}
              <TimeAxis axis={axis} height={height} />
              {DAYS.map((day, index) => (
                <DayTrack
                  key={day}
                  weekday={index + 1}
                  templates={templates.filter((template) => template.weekday === index + 1)}
                  coaches={coaches}
                  ticks={axis.ticks}
                  axisStart={axis.axisStart}
                  height={height}
                  canWrite={canWrite}
                  onCreate={startFromGrid}
                  onEdit={startEdit}
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
                templates={templates.filter((template) => template.weekday === mobileDay)}
                coaches={coaches}
                ticks={axis.ticks}
                axisStart={axis.axisStart}
                height={height}
                canWrite={canWrite}
                onCreate={startFromGrid}
                onEdit={startEdit}
              />
            </div>
          </div>

          {canWrite ? (
            <p className="text-xs text-muted-foreground">Tocá un espacio libre para añadir un hueco o un bloque para editarlo.</p>
          ) : null}
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
  coaches,
  ticks,
  axisStart,
  height,
  canWrite,
  onCreate,
  onEdit,
}: {
  weekday: number;
  templates: Template[];
  coaches: Coach[];
  ticks: number[];
  axisStart: number;
  height: number;
  canWrite: boolean;
  onCreate: (event: MouseEvent<HTMLDivElement>, weekday: number) => void;
  onEdit: (template: Template) => void;
}) {
  return (
    <div
      className={`relative border-l border-border ${canWrite ? "cursor-pointer" : ""}`}
      style={{ height }}
      onClick={(event) => onCreate(event, weekday)}
      aria-label={DAYS[weekday - 1]}
    >
      <GridLines ticks={ticks} axisStart={axisStart} />
      {templates.map((template) => {
        const box = templateBlockBox(template, axisStart, PX_PER_HOUR);
        const coach = coaches.find((item) => item.id === template.coachId)?.name;
        const details = `${template.classTypeName}, ${template.startTime}–${template.endTime}, ${template.defaultCapacity} plazas${coach ? `, ${coach}` : ", sin coach"}`;
        const classNames = "absolute z-10 grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-1 overflow-hidden rounded-md bg-card p-1 text-left ring-1 ring-foreground/15 transition-transform duration-150 ease-out active:scale-[0.97]";
        const style = {
          top: box.top + BLOCK_INSET,
          height: Math.max(box.height - BLOCK_INSET * 2, 56),
          left: BLOCK_INSET,
          right: BLOCK_INSET,
        };
        const contents = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={template.imageUrl} alt="" className="size-7 rounded-sm object-cover" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-semibold">{template.classTypeName}</span>
              <span className="truncate text-[0.7rem] text-muted-foreground tabular-nums">
                {template.startTime}–{template.endTime}
              </span>
              <span className="truncate text-[0.7rem] text-muted-foreground">
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

function TemplateEditor({
  draft,
  types,
  coaches,
  onClose,
}: {
  draft: Draft;
  types: ClassType[];
  coaches: Coach[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isEditing = Boolean(draft.template);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      weekday: Number(form.get("weekday")),
      startTime: String(form.get("startTime")),
      endTime: String(form.get("endTime")),
      classTypeId: String(form.get("classTypeId")),
      coachId: String(form.get("coachId") || "") || null,
      defaultCapacity: Number(form.get("defaultCapacity")),
    };

    if (draft.template && !window.confirm(
      "Este cambio puede afectar reservas futuras y rige desde el lunes siguiente. ¿Querés continuar?",
    )) {
      return;
    }

    setPending(true);
    try {
      if (draft.template) {
        const result = await api<{ summary: Summary }>(`/api/v1/admin/templates/${draft.template.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success(summaryMessage(result.summary));
      } else {
        await api("/api/v1/admin/templates", { method: "POST", body: JSON.stringify(body) });
        toast.success("Hueco añadido a la plantilla.");
      }
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el hueco");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!draft.template || !window.confirm("¿Quitar este hueco de la plantilla? Rige desde el lunes siguiente.")) {
      return;
    }
    setPending(true);
    try {
      const result = await api<{ summary: Summary }>(`/api/v1/admin/templates/${draft.template.id}`, {
        method: "DELETE",
      });
      toast.success(summaryMessage(result.summary));
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar el hueco");
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      busy={pending}
      wide
      title={isEditing ? "Editar hueco" : "Nuevo hueco"}
      description={isEditing ? "Los cambios se aplican desde el próximo lunes." : "Elegí el día, el horario, el tipo y el aforo."}
    >
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
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
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={onClose}>
            Cancelar
          </Button>
          {draft.template ? (
            <Button type="button" variant="destructive" className="min-h-11" disabled={pending} onClick={() => void onDelete()}>
              Quitar hueco
            </Button>
          ) : null}
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Añadir hueco"}
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}
