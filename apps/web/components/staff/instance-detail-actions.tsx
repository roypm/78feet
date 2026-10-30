"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/staff/form-dialog";
import { InstanceForm } from "./instance-form";
import { InstanceCancelButton, InstanceRecoverButton } from "./instance-status-actions";
import type { EditableInstance, ClassType, Training, Coach } from "./instance-form-types";

export function InstanceDetailActions({
  instance,
  classTypes,
  trainings,
  coaches,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <InstanceEditDialog instance={instance} classTypes={classTypes} trainings={trainings} coaches={coaches} />
      {instance.status === "scheduled" ? (
        <InstanceCancelButton instanceId={instance.id} bookedCount={instance.bookedCount} />
      ) : (
        <InstanceRecoverButton instanceId={instance.id} />
      )}
    </div>
  );
}

export function InstanceEditDialog({
  instance,
  classTypes,
  trainings,
  coaches,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <FormDialog
      open={open}
      busy={pending}
      onOpenChange={setOpen}
      title="Editar clase"
      description="Hora, tipo, coach, aforo o entrenamiento."
      trigger={
        <Button type="button" variant="outline" className="min-h-11 shrink-0">
          Editar
        </Button>
      }
    >
      <InstanceForm
        instance={instance}
        classTypes={classTypes}
        trainings={trainings}
        coaches={coaches}
        onSaved={() => setOpen(false)}
        onCancelEdit={() => setOpen(false)}
        onPendingChange={setPending}
      />
    </FormDialog>
  );
}
