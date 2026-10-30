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

export function StaffForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
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
          <Field label="Nombre">
            <Input name="firstName" required />
          </Field>
          <Field label="Apellidos">
            <Input name="lastName" required />
          </Field>
          <Field label="Usuario">
            <Input name="loginId" required autoComplete="off" />
          </Field>
          <Field label="Contraseña">
            <Input name="password" type="password" required minLength={8} />
          </Field>
          <Field label="Rol">
            <select name="role" className={controlClass} defaultValue="coach">
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <Field label="DNI">
            <Input name="dni" required autoComplete="off" />
          </Field>
          <Field label="Teléfono (opcional)">
            <Input name="phone" type="tel" autoComplete="tel" />
          </Field>
          <Field label="Correo (opcional)">
            <Input name="email" type="email" autoComplete="email" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>
              {pending ? "Creando…" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>
    </FormDialog>
  );
}
