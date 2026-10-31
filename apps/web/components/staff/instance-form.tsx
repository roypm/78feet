"use client";
import { TimePicker } from "@/components/staff/time-picker";
import { useEffect } from "react";

import { PendingButton } from "@/components/feedback/pending-button";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSelect } from "@/components/staff/form-select";
import { QuantityField } from "@/components/staff/numeric-field";
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
  onPendingChange,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
  onSaved?: () => void;
  onCancelEdit?: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const { pending, capacityConfirmation, setCapacityConfirmation, onSubmit, confirmCapacityChange } = useInstanceEdit(instance.id, onSaved);
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  const start = clock(instance.startAt);
  const end = clock(instance.endAt);

  return (
    <>
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <TimePicker label="Inicio" disabled={pending} name="startTime" required defaultValue={start} />
          <TimePicker label="Fin" disabled={pending} name="endTime" required defaultValue={end} />
          <FormSelect label="Tipo" name="classTypeId" required defaultValue={instance.classTypeId} disabled={pending}
            options={classTypes.map((type) => ({ value: type.id, label: type.name }))} />
          <FormSelect label="Coach" name="coachId" defaultValue={instance.coachId ?? ""} disabled={pending}
            options={[{ value: "", label: "Sin coach" }, ...coaches.map((coach) => ({ value: coach.id, label: coach.name }))]} />
          <QuantityField label="Aforo" name="capacity" min={1} required defaultValue={instance.capacity} disabled={pending} />
          <FormSelect label="Entrenamiento" name="trainingId" defaultValue={instance.trainingId ?? ""} disabled={pending}
            options={[{ value: "", label: "Ninguno" }, ...trainings.map((training) => ({ value: training.id, label: training.name }))]}>
            {trainings.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay entrenamientos disponibles para este tipo. La clase puede quedar sin plan.
              </p>
            )}
          </FormSelect>
          <DialogFooter>
            {onCancelEdit ? (
              <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={onCancelEdit}>
                Cancelar edición
              </Button>
            ) : null}
            <PendingButton type="submit" className="min-h-11" disabled={pending} pending={pending} pendingLabel={"Guardando…"}>
              {"Guardar"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
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
