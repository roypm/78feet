"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { useInstanceEdit } from "./use-instance-edit";
import type { EditableInstance, ClassType, Training, Coach } from "./instance-form-types";

export function InstanceForm({
  instance,
  classTypes,
  trainings,
  coaches,
  onSaved,
  onCancelEdit,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
  onSaved?: () => void;
  onCancelEdit?: () => void;
}) {
  const { pending, capacityConfirmation, setCapacityConfirmation, onSubmit, confirmCapacityChange } = useInstanceEdit(instance.id, onSaved);
  const start = clock(instance.startAt);
  const end = clock(instance.endAt);

  return (
    <>
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <Field label="Inicio">
        <Input name="startTime" type="time" required defaultValue={start} />
      </Field>
      <Field label="Fin">
        <Input name="endTime" type="time" required defaultValue={end} />
      </Field>
      <Field label="Tipo">
        <select name="classTypeId" required defaultValue={instance.classTypeId} className={controlClass}>
          {classTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Coach">
        <select name="coachId" defaultValue={instance.coachId ?? ""} className={controlClass}>
          <option value="">Sin coach</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Aforo">
        <Input name="capacity" type="number" min={1} required defaultValue={instance.capacity} />
      </Field>
      <Field label="Entrenamiento">
        <select name="trainingId" defaultValue={instance.trainingId ?? ""} className={controlClass}>
          <option value="">Ninguno</option>
          {trainings.map((training) => (
            <option key={training.id} value={training.id}>
              {training.name}
            </option>
          ))}
        </select>
      </Field>
      <DialogFooter>
        {onCancelEdit ? (
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={onCancelEdit}>
            Cancelar edición
          </Button>
        ) : null}
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
      </form>
      <ConfirmDialog
        open={capacityConfirmation !== null}
        onOpenChange={(open) => { if (!open) setCapacityConfirmation(null); }}
        title="Confirmar cambio de aforo"
        description={capacityConfirmation
          ? `${capacityConfirmation.message}. Si continúas, se cancelarán todas las reservas de esta clase y se devolverá el cupo.`
          : ""}
        confirmLabel="Cancelar reservas y guardar"
        confirmVariant="destructive"
        busyLabel="Guardando…"
        busy={pending}
        onConfirm={confirmCapacityChange}
      />
    </>
  );
}

function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
