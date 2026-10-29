"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";

export function StaffBookingForm({
  members,
  classes,
}: {
  members: { id: string; name: string }[];
  classes: {
    id: string;
    label: string;
    roster: { bookingId: string; userId: string; name: string }[];
  }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [instanceId, setInstanceId] = useState(classes[0]?.id ?? "");
  const selected = classes.find((item) => item.id === instanceId);

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/v1/admin/bookings", {
        method: "POST",
        body: JSON.stringify({
          userId: String(form.get("userId")),
          instanceId: String(form.get("instanceId")),
        }),
      });
      toast.success("Reserva creada");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reservar");
    } finally {
      setPending(false);
    }
  }

  async function cancel(bookingId: string, returnQuota: boolean) {
    setPending(true);
    try {
      await api(`/api/v1/admin/bookings/${bookingId}?returnQuota=${returnQuota ? "true" : "false"}`, {
        method: "DELETE",
      });
      toast.success(returnQuota ? "Reserva cancelada. El cupo vuelve." : "Reserva cancelada. El cupo no vuelve.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Clase de hoy">
          <select
            required
            className={controlClass}
            value={instanceId}
            onChange={(event) => setInstanceId(event.target.value)}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        busy={pending}
        trigger={<Button type="button" className="min-h-11" disabled={pending || members.length === 0 || classes.length === 0}>Anotar socio</Button>}
        title="Crear reserva"
        description={selected ? `Añadir un socio a ${selected.label}.` : "Elegí una clase de hoy para continuar."}
      >
        <form onSubmit={(event) => void book(event)} className="flex flex-col gap-4">
          <Field label="Socio">
            <select name="userId" required className={controlClass}>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </Field>
          <input type="hidden" name="instanceId" value={instanceId} readOnly />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending || members.length === 0 || classes.length === 0}>
              {pending ? "Reservando…" : "Crear reserva"}
            </Button>
          </DialogFooter>
        </form>
      </FormDialog>
      {selected ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Apuntados</h2>
          {selected.roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nadie</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selected.roster.map((person) => (
                <li key={person.bookingId} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">{person.name}</span>
                  <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => void cancel(person.bookingId, true)}>
                    Cancelar y devolver
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void cancel(person.bookingId, false)}>
                    Sin devolver
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
