"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";

export function TariffForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState<"monthly" | "pack">("monthly");
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const euros = Number(form.get("price"));
    setPending(true);
    try {
      await api("/api/v1/admin/tariffs", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name")),
          kind,
          priceCents: Math.round(euros * 100),
          weeklyDirected: kind === "monthly" ? Number(form.get("weeklyDirected")) : 0,
          weeklyOpen: kind === "monthly" ? Number(form.get("weeklyOpen")) : 0,
          packClasses: kind === "pack" ? Number(form.get("packClasses")) : null,
        }),
      });
      toast.success("Tarifa creada");
      formElement.reset();
      setKind("monthly");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      trigger={<Button type="button" variant="outline" className="min-h-11">Nueva tarifa</Button>}
        open={open}
        onOpenChange={setOpen}
        busy={pending}
        title="Nueva tarifa"
        description="Definí el precio y los cupos de esta tarifa."
    >
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
          <Field label="Nombre">
            <Input name="name" required />
          </Field>
          <Field label="Tipo">
            <select
              name="kind"
              className={controlClass}
              value={kind}
              onChange={(event) => setKind(event.target.value as "monthly" | "pack")}
            >
              <option value="monthly">Mensual</option>
              <option value="pack">Bono</option>
            </select>
          </Field>
          <Field label="Precio (€)">
            <Input name="price" type="number" min={0} step="0.01" required defaultValue={70} />
          </Field>
          {kind === "monthly" ? (
            <>
              <Field label="Dirigidas / semana">
                <Input name="weeklyDirected" type="number" min={0} required defaultValue={3} />
              </Field>
              <Field label="Opens / semana">
                <Input name="weeklyOpen" type="number" min={0} required defaultValue={1} />
              </Field>
            </>
          ) : (
            <Field label="Clases del bono">
              <Input name="packClasses" type="number" min={1} required defaultValue={8} />
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>
              {pending ? "Creando…" : "Crear tarifa"}
            </Button>
          </DialogFooter>
        </form>
    </FormDialog>
  );
}
