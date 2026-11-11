"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { InstanceForm } from "./instance-form";
import {
  ExtraClassRemoveButton,
  InstanceCancelButton,
  InstanceRecoverButton,
  InstanceRestoreTemplateButton,
} from "./instance-status-actions";
import type { EditableInstance, ClassType, Training, Coach } from "./instance-form-types";

export function InstanceDetailActions({
  instance,
  classTypes,
  trainings,
  coaches,
  returnHref,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
  returnHref: string;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <InstanceEditDialog instance={instance} classTypes={classTypes} trainings={trainings} coaches={coaches} />
      {instance.isExtra && instance.canRecover ? (
        <InstanceRecoverButton instanceId={instance.id} />
      ) : null}
      {instance.isExtra && instance.canRemoveExtra ? (
        <ExtraClassRemoveButton
          instanceId={instance.id}
          bookingHistoryCount={instance.bookingHistoryCount}
          bookedCount={instance.bookedCount}
          returnHref={returnHref}
        />
      ) : null}
      {instance.isExtra && !instance.canRemoveExtra && instance.status === "scheduled" ? (
        <InstanceCancelButton instanceId={instance.id} bookedCount={instance.bookedCount} />
      ) : null}
      {!instance.isExtra && instance.status === "scheduled" ? (
        <InstanceCancelButton instanceId={instance.id} bookedCount={instance.bookedCount} />
      ) : null}
      {!instance.isExtra && instance.canRecover ? (
        <InstanceRecoverButton instanceId={instance.id} />
      ) : null}
      {instance.canRestoreFromTemplate ? (
        <InstanceRestoreTemplateButton instanceId={instance.id} bookedCount={instance.bookedCount} />
      ) : null}
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
