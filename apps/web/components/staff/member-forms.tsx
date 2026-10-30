"use client";

import { PendingButton } from "@/components/feedback/pending-button";
import { EmptyState } from "@/components/feedback/empty-state";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";

type Tariff = { id: string; name: string; active: boolean };

export function CreateMemberAltaButton({ tariffs, canManageTariffs = false }: { tariffs: Tariff[]; canManageTariffs?: boolean }) {
  const { router, pending, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const assignable = tariffs.filter((tariff) => tariff.active);

  if (assignable.length === 0) {
    return (
      <EmptyState compact title="Hace falta una tarifa activa" description={canManageTariffs ? "Creá o activá una tarifa antes de dar de alta a un socio." : "Pedile al admin que cree o active una tarifa antes de dar de alta a un socio."} href={canManageTariffs ? "/staff/tarifas" : undefined} action="Ver tarifas" />
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
      <CreateMemberForm
        tariffs={tariffs}
        pending={pending}
        onPendingChange={setPending}
        onSuccess={(id) => {
          setOpen(false);
          router.push(`/staff/socios/${id}`);
          router.refresh();
        }}
        onCancel={() => setOpen(false)}
      />
    </FormDialog>
  );
}

export function CreateMemberForm({
  tariffs,
  pending = false,
  onPendingChange,
  onSuccess,
  onCancel,
}: {
  tariffs: Tariff[];
  pending?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}) {
  const { router, pending: localPending, begin, setPending: setLocalPending } = useActionFeedback();
  const busy = onPendingChange ? pending : localPending;
  const setBusy = onPendingChange ?? setLocalPending;
  const assignable = tariffs.filter((tariff) => tariff.active);
  const inDialog = Boolean(onCancel);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!begin()) return;
    setBusy(true);
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
        }),
      });
      toast.success("Socio creado");
      if (onSuccess) {
        onSuccess(created.id);
      } else {
        router.push(`/staff/socios/${created.id}`);
        router.refresh();
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setLocalPending(false);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <fieldset disabled={busy} aria-busy={busy} className="contents">
          <Field label="Nombre">
            <Input name="firstName" required autoComplete="given-name" />
          </Field>
          <Field label="Apellidos">
            <Input name="lastName" required autoComplete="family-name" />
          </Field>
          <Field label="DNI">
            <Input name="dni" required />
          </Field>
          <Field label="Contraseña">
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Teléfono">
            <Input name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" />
          </Field>
          <Field label="Tarifa">
            <select name="tariffId" required className={controlClass} defaultValue={assignable[0]?.id}>
              {assignable.map((tariff) => (
                <option key={tariff.id} value={tariff.id}>
                  {tariff.name}
                </option>
              ))}
            </select>
          </Field>
          {inDialog ? (
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onCancel}>
                Cancelar
              </Button>
              <PendingButton
                type="submit"
                className="min-h-11"
                disabled={busy || assignable.length === 0}
                pending={busy}
                pendingLabel={"Creando…"}
              >
                {"Crear socio"}
              </PendingButton>
            </DialogFooter>
          ) : (
            <PendingButton
              type="submit"
              className="min-h-11"
              disabled={busy || assignable.length === 0}
              pending={busy}
              pendingLabel={"Creando…"}
            >
              {"Crear socio"}
            </PendingButton>
          )}
        </fieldset>
      </form>
  );
}
