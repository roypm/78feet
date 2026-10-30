"use client";

import { EmptyState } from "@/components/feedback/empty-state";

import { useState, type MouseEvent } from "react";
import { localDateString, nextMondayDate, type BoxHoursConfig } from "@78feet/domain";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { moduleContentInset } from "@/components/member/module-page";
import { PX_PER_HOUR } from "@/lib/box/column";
import { formatDay } from "@/lib/box/format";
import type { KindView } from "@/lib/box/day-groups";
import type { ScheduleTemplate } from "@/lib/box/template-draft";
import { templateAxis, type TemplateHours } from "@/lib/box/template-layout";
import { TemplateKindPanel } from "./template-schedule/grid";
import { TemplateEditor } from "./template-schedule/editor";
import { ApplyTemplateDialog } from "./template-schedule/apply-dialog";
import { useTemplateDraft } from "./template-schedule/use-template-draft";
import type { TemplateKind, ClassType, Coach } from "./template-schedule/shared";

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
  const [mobileDay, setMobileDay] = useState(1);
  const {
    working, isDirty, draft, setDraft, applyOpen, setApplyOpen, applying,
    startCreate, startEdit: editSlot, cancelDraftChanges, commitSlot, removeSlot, applyTemplate,
  } = useTemplateDraft({ templates, types, openingHours });
  const activeKind = view === "open" ? "open" : "directed";
  const effectiveFrom = formatDay(nextMondayDate(localDateString(new Date())));
  const axis = templateAxis(working.filter((item) => item.kind === activeKind), hours);
  const height = ((axis.axisEnd - axis.axisStart) / 60) * PX_PER_HOUR;

  function startEdit(template: ScheduleTemplate) {
    editSlot(template);
    setMobileDay(template.weekday);
  }

  function startFromGrid(event: MouseEvent<HTMLDivElement>, weekday: number, kind: TemplateKind) {
    if (!canWrite || applying) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const requestedStart = axis.axisStart + ((event.clientY - bounds.top) / PX_PER_HOUR) * 60;
    const start = Math.min(22 * 60 + 45, Math.max(0, Math.round(requestedStart / 15) * 15));
    startCreate(weekday, kind, start);
  }

  return (
    <section className={cn("flex min-h-0 flex-1 flex-col gap-3", moduleContentInset)}>
      {canWrite && isDirty ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={applying} onClick={cancelDraftChanges}>
            Cancelar cambio
          </Button>
          <Button type="button" className="min-h-11" disabled={applying} onClick={() => setApplyOpen(true)}>
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
        <EmptyState title="Primero hace falta un tipo de clase" description={canWrite ? "Creá un tipo para añadir el primer hueco de la plantilla." : "El admin tiene que crear los tipos y configurar la plantilla."} href={canWrite ? "/staff/tipos" : undefined} action="Crear tipo" />
      ) : (
        <TemplateKindPanel
          className="min-h-0 flex-1"
          kind={activeKind}
          working={working}
          types={types}
          coaches={coaches}
          openingHours={openingHours}
          canWrite={canWrite && !applying}
          mobileDay={mobileDay}
          onMobileDayChange={setMobileDay}
          axis={axis}
          height={height}
          onCreate={startFromGrid}
          onEdit={startEdit}
          onAdd={() => startCreate(mobileDay, activeKind)}
        />
      )}

    </section>
  );
}
