"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import type { ScheduleTemplate, TemplateSlotWrite } from "@/lib/box/template-draft";
import { DAYS, type Draft, type ClassType, type Coach } from "./shared";

export function TemplateEditor({
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
