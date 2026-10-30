"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";

export type TeamMember = {
  id: string;
  loginId: string;
  role: "admin" | "coach";
  status: "active" | "inactive";
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
};

export function TeamTable({ staff, currentUserId }: { staff: TeamMember[]; currentUserId: string }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmingPerson, setConfirmingPerson] = useState<TeamMember | null>(null);

  async function setActive(person: TeamMember, active: boolean, confirmed = false) {
    if (active === (person.status === "active")) return;
    if (!active && !confirmed) {
      setConfirmingPerson(person);
      return;
    }

    setPendingId(person.id);
    try {
      await api(`/api/v1/admin/staff/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: active ? "active" : "inactive" }),
      });
      toast.success(active ? "Cuenta activada" : "Cuenta desactivada");
      setConfirmingPerson(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el estado");
    } finally {
      setPendingId(null);
    }
  }

  function openProfile(id: string) {
    router.push(`/staff/equipo/${id}`);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
        <Table className="min-w-[24rem] table-fixed xl:min-w-[64rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 min-w-[12rem] px-3">Persona</TableHead>
            <TableHead className="hidden h-10 min-w-[12rem] px-3 sm:table-cell">Usuario</TableHead>
            <TableHead className="hidden h-10 min-w-[10rem] px-3 xl:table-cell">Teléfono</TableHead>
            <TableHead className="hidden h-10 min-w-[14rem] px-3 xl:table-cell">Correo</TableHead>
            <TableHead className="hidden h-10 w-[7rem] px-3 md:table-cell">Rol</TableHead>
            <TableHead className="h-10 w-[8rem] px-3">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                No hay cuentas de equipo todavía.
              </TableCell>
            </TableRow>
          ) : (
            staff.map((person) => {
              const isAdminAccount = person.role === "admin" && person.firstName === "Admin" && person.lastName === "Box";
              const active = person.status === "active";
              const isCurrentUser = person.id === currentUserId;
              return (
                <TableRow
                  key={person.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Abrir perfil de ${person.firstName} ${person.lastName}`}
                  className="cursor-pointer border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  onClick={() => openProfile(person.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openProfile(person.id);
                    }
                  }}
                >
                  <TableCell className="min-w-[12rem] px-3 py-2.5 align-middle">
                    <div className="min-w-0">
                      <span className="block font-medium wrap-break-word">
                        {person.firstName} {person.lastName}
                      </span>
                      {isAdminAccount && (
                        <span className="mt-0.5 block text-sm text-muted-foreground">Cuenta principal del box</span>
                      )}
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground sm:hidden">
                        {person.loginId}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground xl:hidden">
                        {[person.phone || "Sin indicar", person.email || "Sin indicar"].join(" · ")}
                      </span>
                      <div className="mt-1 flex flex-wrap gap-1.5 md:hidden">
                        <Badge variant="secondary">{person.role === "admin" ? "Admin" : "Coach"}</Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-[16rem] px-3 py-2.5 align-middle sm:table-cell">
                    <span className="block truncate text-sm" title={person.loginId}>{person.loginId}</span>
                  </TableCell>
                  <TableCell className="hidden max-w-[12rem] px-3 py-2.5 align-middle xl:table-cell">
                    <span className="block truncate text-sm" title={person.phone ?? undefined}>
                      {person.phone || "Sin indicar"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-[18rem] px-3 py-2.5 align-middle xl:table-cell">
                    <span className="block truncate text-sm" title={person.email ?? undefined}>
                      {person.email || "Sin indicar"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden px-3 py-2.5 align-middle md:table-cell">
                    <Badge variant="secondary">{person.role === "admin" ? "Admin" : "Coach"}</Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        size="sm"
                        checked={active}
                        disabled={pendingId === person.id || (isCurrentUser && active)}
                        aria-label={
                          isCurrentUser && active
                            ? "No puedes desactivar tu propia cuenta"
                            : active
                              ? `Desactivar ${person.firstName} ${person.lastName}`
                              : `Activar ${person.firstName} ${person.lastName}`
                        }
                        onCheckedChange={(checked) => void setActive(person, checked)}
                      />
                      <span className="text-sm text-muted-foreground" title={isCurrentUser && active ? "No puedes desactivar tu propia cuenta" : undefined}>
                        {active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        </Table>
      </div>
      <ConfirmDialog
        open={confirmingPerson !== null}
        onOpenChange={(open) => { if (!open && pendingId === null) setConfirmingPerson(null); }}
        title="Desactivar cuenta de equipo"
        description={confirmingPerson
          ? `¿Desactivar la cuenta de ${confirmingPerson.firstName} ${confirmingPerson.lastName}? Se cerrará su acceso al panel.`
          : ""}
        confirmLabel="Desactivar cuenta"
        confirmVariant="destructive"
        busyLabel="Desactivando…"
        busy={confirmingPerson !== null && pendingId === confirmingPerson.id}
        onConfirm={() => {
          if (confirmingPerson) void setActive(confirmingPerson, false, true);
        }}
      />
    </>
  );
}
