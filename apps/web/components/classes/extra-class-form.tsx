"use client";

import { FormActions } from "@/components/common/forms/form-actions";
import { TimePicker } from "@/components/common/forms/time-picker";
import { DatePicker } from "@/components/common/forms/date-picker";


import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { createExtraInstance } from "@/lib/box/instance-mutations";
import { Button } from "@/components/ui/button";
import { QuantityField } from "@/components/common/forms/numeric-field";
import { FormSelect } from "@/components/common/forms/form-select";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import type { ClassType, Coach } from "./instance-form-types";
import type { BoxSummary } from "@/lib/box/boxes";

export function ExtraClassForm({
  defaultDate,
  classTypes,
  coaches,
  boxes,
}: {
  defaultDate: string;
  classTypes: ClassType[];
  coaches: Coach[];
  boxes: readonly BoxSummary[];
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!begin()) return;
    try {
      const created = await createExtraInstance({
        date: String(form.get("date")),
        startTime: String(form.get("startTime")),
        endTime: String(form.get("endTime")),
        classTypeId: String(form.get("classTypeId")),
        coachId: String(form.get("coachId") || "") || null,
        capacity: Number(form.get("capacity")),
        boxId: String(form.get("boxId")),
      });
      toast.success("Clase extra creada");
      setOpen(false);
      router.push(`/staff/clases/${created.id}?desde=excepciones`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  return (
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        busy={pending}
        trigger={<Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={classTypes.length === 0}>Añadir clase extra</Button>}
        title="Añadir clase extra"
        description="Fuera de la plantilla semanal. Elegí el día (también más allá del horizonte de Semana)."
      >
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormSelect label="Box" name="boxId" required disabled={pending}
            defaultValue={boxes[0]?.id ?? ""} options={boxes.map((box) => ({ value: box.id, label: box.name }))} />
          <DatePicker label="Día" disabled={pending} name="date" required min={defaultDate} defaultValue={defaultDate} />
          <TimePicker label="Inicio" disabled={pending} name="startTime" required />
          <TimePicker label="Fin" disabled={pending} name="endTime" required />
          <FormSelect label="Tipo" name="classTypeId" required disabled={pending}
            defaultValue="" options={[{ value: "", label: "Elegí un tipo de clase…" }, ...classTypes.map((type) => ({ value: type.id, label: type.name }))]} />
          <FormSelect label="Coach" name="coachId" defaultValue="" disabled={pending}
            options={[{ value: "", label: "Sin coach" }, ...coaches.map((coach) => ({ value: coach.id, label: coach.name }))]} />
          <QuantityField label="Aforo" name="capacity" min={1} required disabled={pending} />
          <FormActions pending={pending} onCancel={() => setOpen(false)} submitLabel={"Añadir clase"} pendingLabel={"Creando…"} submitDisabled={pending || classTypes.length === 0} />
        </fieldset>
      </form>
      </FormDialog>
  );
}
