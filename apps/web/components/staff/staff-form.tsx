"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormInput } from "@/components/staff/form-control";
import { FormSelect } from "@/components/staff/form-select";
import { FormDialog } from "@/components/staff/form-dialog";

export function StaffForm() {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (!begin()) return;
    try {
      await api("/api/v1/admin/staff", {
        method: "POST",
        body: JSON.stringify({
          loginId: String(form.get("loginId")),
          password: String(form.get("password")),
          firstName: String(form.get("firstName")),
          lastName: String(form.get("lastName")),
          role: String(form.get("role")),
          dni: String(form.get("dni")),
          phone: String(form.get("phone") || "") || null,
          email: String(form.get("email") || "") || null,
        }),
      });
      toast.success("Cuenta creada");
      formElement.reset();
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
        trigger={<Button type="button" variant="outline" className="min-h-11">Añadir cuenta</Button>}
        open={open}
        onOpenChange={setOpen}
        busy={pending}
        title="Nueva cuenta de staff"
        description="Creá un acceso para una persona del equipo."
    >
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" name="firstName" required />
          <FormInput label="Apellidos" name="lastName" required />
          <FormInput label="Usuario" name="loginId" required autoComplete="off" />
          <FormInput label="Contraseña" name="password" type="password" required minLength={8} />
          <FormSelect label="Rol" name="role" required defaultValue="" disabled={pending}
            options={[{ value: "", label: "Elegí un rol…" }, { value: "coach", label: "Coach" }, { value: "admin", label: "Admin" }]} />
          <FormInput label="DNI" name="dni" required autoComplete="off" />
          <FormInput label="Teléfono (opcional)" name="phone" type="tel" autoComplete="tel" />
          <FormInput label="Correo (opcional)" name="email" type="email" autoComplete="email" />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <PendingButton type="submit" className="min-h-11" disabled={pending} pending={pending} pendingLabel={"Creando…"}>
              {"Crear cuenta"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
    </FormDialog>
  );
}
