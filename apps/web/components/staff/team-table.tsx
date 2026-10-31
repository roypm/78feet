"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { ListSearchToolbar } from "@/components/staff/list-search-toolbar";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { matchesSearch, searchHaystack } from "@/lib/ui/search";

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

export function TeamTable({ staff, currentUserId, action }: { staff: TeamMember[]; currentUserId: string; action?: ReactNode }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => staff.filter((person) => matchesSearch(query, searchHaystack([
    person.firstName, person.lastName, person.loginId, person.phone, person.email,
    person.role === "admin" ? "Admin" : "Coach",
  ]))), [staff, query]);
  const { router, pending, begin, setPending } = useActionFeedback();
  const [activeId, setActiveId] = useState<string | null>(null);
  const pendingId = pending ? activeId : null;
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmingPerson, setConfirmingPerson] = useState<TeamMember | null>(null);

  async function setActive(person: TeamMember, active: boolean, confirmed = false) {
    if (active === (person.status === "active")) return;
    if (!active && !confirmed) {
      setConfirmingPerson(person);
      return;
    }

    if (!begin()) return;
    setOpeningId(null);
    setActiveId(person.id);
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
      setPending(false);
    }
  }

  function openProfile(id: string) {
    setActiveId(null);
    setOpeningId(id);
    router.push(`/staff/equipo/${id}`);
  }

  function clearQuery() {
    setQuery("");
    searchRef.current?.focus({ preventScroll: true });
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <ListSearchToolbar action={action}>
          <SearchInput ref={searchRef} aria-label="Buscar en el equipo" placeholder="Buscar por nombre, usuario o contacto…"
            value={query} onValueChange={setQuery} />
        </ListSearchToolbar>
        {staff.length > 0 && filtered.length === 0 ? (
          <EmptyState compact title="Sin coincidencias en el equipo" description="Probá con otro nombre, usuario, teléfono, correo o rol.">
            <Button type="button" variant="outline" className="min-h-11" onClick={clearQuery}>Limpiar búsqueda</Button>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
            <Table className="min-w-[24rem] table-fixed xl:min-w-[64rem]">
              <TableHeader>
                <TableRow className="pointer-hover:bg-transparent">
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
                      <EmptyState compact title="No hay cuentas de equipo" description="Usá el alta de equipo para crear una cuenta de coach o admin." />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((person) => {
                    const isAdminAccount = person.role === "admin" && person.firstName === "Admin" && person.lastName === "Box";
                    const active = person.status === "active";
                    const isCurrentUser = person.id === currentUserId;
                    return (
                      <TableRow
                        key={person.id}
                        role="link"
                        tabIndex={0}
                        aria-busy={pending && (pendingId === person.id || openingId === person.id)}
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
                              {pending && openingId === person.id && <Spinner aria-label="Abriendo perfil" />}
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
                              disabled={pending || (isCurrentUser && active)}
                              aria-busy={pendingId === person.id}
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
                              {pendingId === person.id ? <span role="status" className="inline-flex items-center gap-1"><Spinner aria-hidden="true" />Actualizando…</span> : active ? "Activo" : "Inactivo"}
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
        )}
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
