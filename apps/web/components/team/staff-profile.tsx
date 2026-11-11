"use client";

import { FormActions } from "@/components/common/forms/form-actions";


import { useState, type FormEvent, type ReactNode } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/common/forms/form-control";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { emptyField, displayPhone } from "@/lib/box/format";
import { ProfileAvatar } from "@/components/common/media/profile-avatar";

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
  profileImageUrl: string | null;
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
  const { router, pending, begin, setPending } = useActionFeedback();
  const [editing, setEditing] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    if (!begin()) return;
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
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" name="firstName" required defaultValue={person.firstName} autoComplete="given-name" />
          <FormInput label="Apellidos" name="lastName" required defaultValue={person.lastName} autoComplete="family-name" />
          <FormInput label="Teléfono" name="phone" type="tel" defaultValue={person.phone ?? ""} autoComplete="tel" />
          <FormInput label="Correo" name="email" type="email" defaultValue={person.email ?? ""} autoComplete="email" />
          <FormActions pending={pending} onCancel={() => setEditing(false)} submitLabel={"Guardar cambios"} pendingLabel={"Guardando…"} />
        </fieldset>
      </form>
    </FormDialog>
  );

  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ProfileAvatar name={`${person.firstName} ${person.lastName}`} imageUrl={person.profileImageUrl} size="sm" />
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
            <ProfileField label="DNI" value={emptyField(person.dni)} />
            <ProfileField label="Teléfono" value={displayPhone(person.phone)} />
            <ProfileField label="Correo" value={emptyField(person.email)} />
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
