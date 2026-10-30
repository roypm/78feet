"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";

export type StaffProfileData = {
  id: string;
  loginId: string;
  role: "coach" | "admin";
  status: "active" | "inactive";
  firstName: string;
  lastName: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
};

function ProfileField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word">{value}</dd>
    </div>
  );
}

export function StaffProfile({ person }: { person: StaffProfileData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    setPending(true);
    try {
      await api(`/api/v1/admin/staff/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: String(form.get("firstName")),
          lastName: String(form.get("lastName")),
          phone: phone || null,
          email: email || null,
        }),
      });
      toast.success("Perfil actualizado");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el perfil");
    } finally {
      setPending(false);
    }
  }

  const editDialog = (
    <FormDialog
      open={editing}
      onOpenChange={setEditing}
      busy={pending}
      trigger={
        <Button type="button" variant="outline" className="min-h-11" disabled={pending}>
          Editar perfil
        </Button>
      }
      title="Editar perfil de equipo"
      description="Actualiza los datos personales y de contacto de esta cuenta."
    >
      <form onSubmit={(event) => void saveProfile(event)} className="flex flex-col gap-4">
        <Field label="Nombre">
          <Input name="firstName" required defaultValue={person.firstName} autoComplete="given-name" />
        </Field>
        <Field label="Apellidos">
          <Input name="lastName" required defaultValue={person.lastName} autoComplete="family-name" />
        </Field>
        <Field label="Teléfono">
          <Input name="phone" type="tel" defaultValue={person.phone ?? ""} autoComplete="tel" />
        </Field>
        <Field label="Correo">
          <Input name="email" type="email" defaultValue={person.email ?? ""} autoComplete="email" />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );

  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{person.role === "admin" ? "Admin" : "Coach"}</Badge>
          <Badge variant={person.status === "active" ? "secondary" : "outline"}>
            {person.status === "active" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        {editDialog}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-medium">Datos personales y contacto</h2>
          <dl className="flex flex-col gap-3">
            <ProfileField label="Nombre" value={`${person.firstName} ${person.lastName}`} />
            <ProfileField label="DNI" value={person.dni ?? "—"} />
            <ProfileField label="Teléfono" value={person.phone ?? "—"} />
            <ProfileField label="Correo" value={person.email ?? "—"} />
          </dl>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium">Acceso al panel</h2>
          <dl className="flex flex-col gap-3">
            <ProfileField label="Usuario" value={person.loginId} />
            <ProfileField label="Tipo de cuenta" value={person.role === "admin" ? "Admin" : "Coach"} />
            <ProfileField label="Estado" value={person.status === "active" ? "Activo" : "Inactivo"} />
          </dl>
        </div>
      </div>
    </section>
  );
}
