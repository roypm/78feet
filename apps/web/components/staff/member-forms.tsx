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

type Tariff = { id: string; name: string; active: boolean };

export function CreateMemberForm({ tariffs }: { tariffs: Tariff[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const assignable = tariffs.filter((tariff) => tariff.active);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
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
      router.push(`/staff/socios/${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input name="firstName" required />
      </Field>
      <Field label="Apellidos">
        <Input name="lastName" required />
      </Field>
      <Field label="DNI">
        <Input name="dni" required />
      </Field>
      <Field label="Contraseña">
        <Input name="password" type="password" required minLength={8} />
      </Field>
      <Field label="Teléfono">
        <Input name="phone" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" />
      </Field>
      <Field label="Tarifa">
        <select name="tariffId" required className={controlClass}>
          {assignable.map((tariff) => (
            <option key={tariff.id} value={tariff.id}>
              {tariff.name}
            </option>
          ))}
        </select>
      </Field>
      <Button type="submit" className="min-h-11" disabled={pending || assignable.length === 0}>
        {pending ? "Creando…" : "Crear socio"}
      </Button>
    </form>
  );
}

export function MemberActions({
  memberId,
  tariffs,
  currentTariffId,
  canDeactivate,
}: {
  memberId: string;
  tariffs: Tariff[];
  currentTariffId: string | null;
  canDeactivate: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [openAction, setOpenAction] = useState<"tariff" | "credits" | "password" | null>(null);
  const assignable = tariffs.filter((tariff) => tariff.active);

  async function changeTariff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const tariffId = String(new FormData(formElement).get("tariffId"));
    const ok = window.confirm(
      "Este cambio cancela todas las reservas futuras del socio y devuelve el cupo/saldo. El socio se vuelve a apuntar con la tarifa nueva.",
    );
    if (!ok) return;
    setPending(true);
    try {
      const result = await api<{ cancelledBookingCount: number }>(`/api/v1/admin/members/${memberId}/tariff`, {
        method: "POST",
        body: JSON.stringify({ tariffId }),
      });
      toast.success(`Tarifa cambiada. ${result.cancelledBookingCount} reservas canceladas.`);
      formElement.reset();
      setOpenAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar");
    } finally {
      setPending(false);
    }
  }

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    try {
      await api(`/api/v1/admin/members/${memberId}/credits`, {
        method: "POST",
        body: JSON.stringify({
          quantity: Number(form.get("quantity")),
          note: String(form.get("note") || "") || null,
        }),
      });
      toast.success("Saldo recargado");
      formElement.reset();
      setOpenAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo recargar");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const password = String(new FormData(formElement).get("password"));
    setPending(true);
    try {
      await api(`/api/v1/admin/members/${memberId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      toast.success("Contraseña reseteada");
      formElement.reset();
      setOpenAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo resetear");
    } finally {
      setPending(false);
    }
  }

  async function payMonth() {
    setPending(true);
    try {
      const month = new Date().toISOString().slice(0, 7) + "-01";
      await api("/api/v1/admin/payments", {
        method: "POST",
        body: JSON.stringify({ userId: memberId, kind: "monthly", month, amountCents: 0 }),
      });
      toast.success("Pago del mes marcado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar");
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    if (!window.confirm("¿Dar de baja a este socio? Se cancelan las reservas futuras.")) return;
    setPending(true);
    try {
      await api(`/api/v1/admin/members/${memberId}/deactivate`, { method: "POST" });
      toast.success("Socio dado de baja");
      router.push("/staff/socios");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo dar de baja");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
      <FormDialog
        open={openAction === "tariff"}
        onOpenChange={(open) => setOpenAction(open ? "tariff" : null)}
        busy={pending}
        trigger={<Button type="button" variant="outline" className="min-h-11" disabled={pending || assignable.length === 0}>Cambiar tarifa</Button>}
        title="Cambiar tarifa"
        description="El cambio cancela las reservas futuras y devuelve su cupo o saldo. La persona tendrá que volver a apuntarse."
      >
        <form onSubmit={(event) => void changeTariff(event)} className="flex flex-col gap-4">
          <Field label="Nueva tarifa">
            <select name="tariffId" required defaultValue={currentTariffId ?? ""} className={controlClass}>
              {assignable.map((tariff) => <option key={tariff.id} value={tariff.id}>{tariff.name}</option>)}
            </select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpenAction(null)}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Cambiando…" : "Cambiar tarifa"}</Button>
          </DialogFooter>
        </form>
      </FormDialog>
      <FormDialog
        open={openAction === "credits"}
        onOpenChange={(open) => setOpenAction(open ? "credits" : null)}
        busy={pending}
        trigger={<Button type="button" variant="outline" className="min-h-11" disabled={pending}>Cargar bono</Button>}
        title="Cargar bono"
        description="Añadí clases al saldo de bono del socio."
      >
        <form onSubmit={(event) => void grant(event)} className="flex flex-col gap-4">
          <Field label="Clases">
            <Input name="quantity" type="number" min={1} required defaultValue={5} />
          </Field>
          <Field label="Nota">
            <Input name="note" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpenAction(null)}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Recargando…" : "Recargar saldo"}</Button>
          </DialogFooter>
        </form>
      </FormDialog>
      <FormDialog
        open={openAction === "password"}
        onOpenChange={(open) => setOpenAction(open ? "password" : null)}
        busy={pending}
        trigger={<Button type="button" variant="outline" className="min-h-11" disabled={pending}>Resetear contraseña</Button>}
        title="Resetear contraseña"
        description="Definí la nueva contraseña que usará el socio para entrar."
      >
        <form onSubmit={(event) => void resetPassword(event)} className="flex flex-col gap-4">
          <Field label="Nueva contraseña">
            <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpenAction(null)}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending}>{pending ? "Guardando…" : "Resetear contraseña"}</Button>
          </DialogFooter>
        </form>
      </FormDialog>
      </div>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => void payMonth()}>
        Marcar pago del mes
      </Button>
      {canDeactivate ? (
        <Button type="button" variant="destructive" disabled={pending} onClick={() => void deactivate()}>
          Dar de baja
        </Button>
      ) : null}
    </div>
  );
}
