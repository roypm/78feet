"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { createExtraInstance } from "@/lib/box/instance-mutations";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import type { ClassType, Coach } from "./instance-form-types";

export function ExtraClassForm({
  defaultDate,
  classTypes,
  coaches,
}: {
  defaultDate: string;
  classTypes: ClassType[];
  coaches: Coach[];
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
      });
      toast.success("Clase extra creada");
      setOpen(false);
      router.push(`/staff/clases/${created.id}`);
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
          <Field label="Día">
            <Input name="date" type="date" required defaultValue={defaultDate} />
          </Field>
          <Field label="Inicio">
            <Input name="startTime" type="time" required defaultValue="18:00" />
          </Field>
          <Field label="Fin">
            <Input name="endTime" type="time" required defaultValue="19:00" />
          </Field>
          <Field label="Tipo">
            <select name="classTypeId" required className={controlClass}>
              {classTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Coach">
            <select name="coachId" className={controlClass} defaultValue="">
              <option value="">Sin coach</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Aforo">
            <Input name="capacity" type="number" min={1} required defaultValue={12} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <PendingButton
              type="submit"
              className="min-h-11"
              disabled={pending || classTypes.length === 0}
              pending={pending}
              pendingLabel={"Creando…"}
            >
              {"Añadir clase"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
      </FormDialog>
  );
}
