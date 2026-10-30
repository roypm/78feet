"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { EmptyState } from "@/components/feedback/empty-state";

import { useMemo, useState, type FormEvent } from "react";
import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/staff/form-dialog";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { MemberPicker } from "@/components/staff/member-picker";
import { ModulePrimaryAction } from "@/components/member/module-page";

export function ClassRosterPanel({
  instanceId,
  instanceLabel,
  canAddMember,
  canRemoveMember,
  instanceStatus,
  members,
  roster,
}: {
  instanceId: string;
  instanceLabel: string;
  canAddMember: boolean;
  canRemoveMember: boolean;
  instanceStatus: "scheduled" | "cancelled";
  members: { id: string; name: string }[];
  roster: { bookingId: string; userId: string; name: string; phone: string | null }[];
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [removal, setRemoval] = useState<{
    bookingId: string;
    returnQuota: boolean;
    name: string;
  } | null>(null);
  const bookedIds = useMemo(() => new Set(roster.map((person) => person.userId)), [roster]);
  const available = useMemo(
    () => members.filter((member) => !bookedIds.has(member.id)),
    [members, bookedIds],
  );

  const selectedAvailableUserId = available.some((member) => member.id === selectedUserId)
    ? selectedUserId
    : available[0]?.id ?? "";

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAvailableUserId) {
      toast.error("Elegí un socio");
      return;
    }
    if (!begin()) return;
    try {
      await api("/api/v1/admin/bookings", {
        method: "POST",
        body: JSON.stringify({
          userId: selectedAvailableUserId,
          instanceId,
        }),
      });
      toast.success("Socio apuntado");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo apuntar");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!removal) return;
    const { bookingId, returnQuota } = removal;
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/bookings/${bookingId}?returnQuota=${returnQuota ? "true" : "false"}`, {
        method: "DELETE",
      });
      toast.success(returnQuota ? "Socio quitado. El cupo vuelve." : "Socio quitado. El cupo no vuelve.");
      setRemoval(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar");
    } finally {
      setPending(false);
    }
  }

  const showAddUi = instanceStatus === "scheduled";

  return (
    <div className="flex flex-col gap-3">
      {showAddUi ? (
        canAddMember ? (
          <ModulePrimaryAction>
            <FormDialog
              open={open}
              onOpenChange={setOpen}
              busy={pending}
              trigger={
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={pending || available.length === 0}
                >
                  Añadir socio
                </Button>
              }
              title="Añadir socio a la clase"
              description={`Apuntar un socio a ${instanceLabel}.`}
            >
              <form onSubmit={(event) => void book(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <MemberPicker
            key={open ? "open" : "closed"}
            members={available}
            value={selectedAvailableUserId}
            onChange={setSelectedUserId}
            disabled={pending}
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <PendingButton
              type="submit"
              className="min-h-11"
              disabled={pending || available.length === 0 || !selectedAvailableUserId}
              pending={pending}
              pendingLabel={"Apuntando…"}
            >
              {"Apuntar"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
            </FormDialog>
          </ModulePrimaryAction>
        ) : (
          <p className="text-sm text-muted-foreground">
            La clase ya empezó; no se pueden apuntar más socios (misma regla que en la app del socio).
          </p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">Clase cancelada; no se pueden hacer reservas nuevas.</p>
      )}
      {showAddUi && canAddMember && available.length === 0 && members.length > 0 ? (
        <EmptyState compact title="Todos los socios activos ya están apuntados" description="No quedan socios disponibles para añadir a esta clase." />
      ) : null}
      {showAddUi && canAddMember && members.length === 0 ? (
        <EmptyState compact title="No hay socios activos para apuntar" description="Creá o reactivá una cuenta desde Socios." href="/staff/socios" action="Ver socios" />
      ) : null}

      {roster.length === 0 ? (
        <EmptyState compact title="Todavía no hay nadie apuntado" description="Los socios que reserves para esta clase aparecerán acá." />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
          <Table className="min-w-[20rem] md:min-w-[32rem]">
            <TableHeader>
              <TableRow className="pointer-hover:bg-transparent">
                <TableHead className="h-10 min-w-[9rem] px-3">Socio</TableHead>
                <TableHead className="h-10 px-3">Teléfono</TableHead>
                {canRemoveMember ? (
                  <TableHead className="h-10 w-0 px-3 text-right">Acciones</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((person) => (
                <TableRow key={person.bookingId} className="border-border">
                  <TableCell className="min-w-[9rem] px-3 py-2.5 align-middle text-sm">
                    <Link href={`/staff/socios/${person.userId}`} className="font-medium text-primary">
                      {person.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {person.phone ?? "—"}
                  </TableCell>
                  {canRemoveMember ? (
                    <TableCell className="w-0 whitespace-nowrap px-3 py-2.5 align-middle text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={pending}
                          onClick={() => setRemoval({ bookingId: person.bookingId, returnQuota: true, name: person.name })}
                        >
                          Quitar y devolver
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          disabled={pending}
                          onClick={() => setRemoval({ bookingId: person.bookingId, returnQuota: false, name: person.name })}
                        >
                          Sin devolver
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmDialog
        open={removal !== null}
        onOpenChange={(open) => { if (!open) setRemoval(null); }}
        title={removal?.returnQuota ? "Quitar socio y devolver cupo" : "Quitar socio sin devolver cupo"}
        description={removal
          ? removal.returnQuota
            ? `¿Quitar a ${removal.name} de esta clase? Su cupo vuelve a estar disponible.`
            : `¿Quitar a ${removal.name} de esta clase sin devolverle el cupo?`
          : ""}
        confirmLabel={removal?.returnQuota ? "Quitar y devolver" : "Quitar sin devolver"}
        confirmVariant="destructive"
        busyLabel="Quitando…"
        busy={pending}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
