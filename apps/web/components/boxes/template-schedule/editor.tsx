import { TimePicker } from "@/components/common/forms/time-picker";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { QuantityField } from "@/components/common/forms/numeric-field";
import { FormSelect } from "@/components/common/forms/form-select";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import type { ScheduleTemplate, TemplateSlotWrite } from "@/lib/box/template-draft";
import { DAYS, type Draft, type ClassType, type Coach } from "./shared";

export function TemplateEditor({
  draft,
  types,
  coaches,
  onClose,
  onCommit,
  onRemove,
  onDuplicate,
}: {
  draft: Draft;
  types: ClassType[];
  coaches: Coach[];
  onClose: () => void;
  onCommit: (slot: TemplateSlotWrite, existing?: ScheduleTemplate) => void;
  onRemove: (id: string) => void;
  onDuplicate?: () => void;
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
          <FormSelect label="Día" name="weekday" required defaultValue={String(draft.weekday)}
            options={DAYS.map((day, index) => ({ value: String(index + 1), label: day }))} />
          <FormSelect label="Tipo" name="classTypeId" required defaultValue={draft.classTypeId}
            options={[{ value: "", label: "Elegí un tipo de clase…" }, ...types.map((type) => ({ value: type.id, label: type.name }))]} />
          <TimePicker label="Inicio" name="startTime" required defaultValue={draft.startTime} />
          <TimePicker label="Fin" name="endTime" required defaultValue={draft.endTime} />
          <FormSelect label="Coach" name="coachId" defaultValue={draft.coachId ?? ""}
            options={[{ value: "", label: "Sin coach" }, ...coaches.map((coach) => ({ value: coach.id, label: coach.name }))]} />
          <QuantityField label="Aforo" name="defaultCapacity" min={1} required defaultValue={draft.defaultCapacity} />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
            Cerrar
          </Button>
          {onDuplicate ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={onDuplicate}>
              Duplicar
            </Button>
          ) : null}
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
