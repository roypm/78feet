"use client";

import { FormActions } from "@/components/common/forms/form-actions";

import { EmptyState } from "@/components/common/feedback/empty-state";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/common/forms/form-control";
import { FormSelect } from "@/components/common/forms/form-select";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import type { BoxSummary } from "@/lib/box/boxes";

type Tariff = { id: string; name: string; active: boolean };

export function CreateMemberAltaButton({
  tariffs,
  boxes,
  canManageTariffs = false,
}: {
  tariffs: Tariff[];
  boxes: readonly BoxSummary[];
  canManageTariffs?: boolean;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const assignable = tariffs.filter((tariff) => tariff.active);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!begin()) return;
    try {
      const created = await api<{ id: string }>("/api/v1/admin/members", {
        method: "POST",
        body: JSON.stringify({
          dni: String(form.get("dni")),
          password: String(form.get("password")),
          firstName: String(form.get("firstName")),
          lastName: String(form.get("lastName")),
          phone: String(form.get("phone") || "") || null,
          email: String(form.get("email") || "") || null,
          tariffId: String(form.get("tariffId")),
          paymentBoxId: String(form.get("paymentBoxId")),
        }),
      });
      toast.success("Socio creado");
      setOpen(false);
      router.push(`/staff/socios/${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  if (assignable.length === 0) {
    return (
      <EmptyState
        compact
        title="Hace falta una tarifa activa"
        description={
          canManageTariffs
            ? "Creá o activá una tarifa antes de dar de alta a un socio."
            : "Pedile al admin que cree o active una tarifa antes de dar de alta a un socio."
        }
        href={canManageTariffs ? "/staff/tarifas" : undefined}
        action="Ver tarifas"
      />
    );
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      busy={pending}
      wide
      trigger={
        <Button type="button" variant="outline" className="min-h-11">
          Alta de socio
        </Button>
      }
      title="Alta de socio"
      description="Datos del socio y tarifa inicial."
    >
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" name="firstName" required autoComplete="given-name" />
          <FormInput label="Apellidos" name="lastName" required autoComplete="family-name" />
          <FormInput label="DNI" name="dni" required />
          <FormInput
            label="Contraseña"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <FormInput label="Teléfono" name="phone" type="tel" autoComplete="tel" />
          <FormInput label="Email" name="email" type="email" autoComplete="email" />
          <FormSelect
            label="Box de pago"
            name="paymentBoxId"
            required
            disabled={pending}
            defaultValue={boxes[0]?.id ?? ""}
            options={boxes.map((box) => ({ value: box.id, label: box.name }))}
          />
          <FormSelect
            label="Tarifa"
            name="tariffId"
            required
            defaultValue=""
            disabled={pending}
            options={[
              { value: "", label: "Elegí una tarifa…" },
              ...assignable.map((tariff) => ({
                value: tariff.id,
                label: tariff.name,
              })),
            ]}
          />
          <FormActions
            pending={pending}
            onCancel={() => setOpen(false)}
            submitLabel="Crear socio"
            pendingLabel="Creando…"
            submitDisabled={assignable.length === 0}
          />
        </fieldset>
      </form>
    </FormDialog>
  );
}
