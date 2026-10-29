"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";

export function StaffForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
          dni: String(form.get("dni") || "") || null,
        }),
      });
      toast.success("Cuenta creada");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex max-w-lg flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
      <h2 className="font-medium">Nueva cuenta de staff</h2>
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
      <Field label="DNI (opcional)">
        <Input name="dni" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear"}
      </Button>
    </form>
  );
}
