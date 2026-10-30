"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { FormDialog } from "@/components/staff/form-dialog";

type ClassType = { id: string; name: string; kind: "directed" | "open" };
type Training = { id: string; name: string; classTypeId: string };
type Coach = { id: string; name: string };

export type EditableInstance = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  classTypeId: string;
  coachId: string | null;
  capacity: number;
  status: "scheduled" | "cancelled";
  trainingId: string | null;
  bookedCount: number;
};

async function patchInstance(
  instanceId: string,
  body: Record<string, unknown>,
  confirmCapacity = false,
): Promise<{ cancelledBookingCount: number }> {
  return api<{ cancelledBookingCount: number }>(`/api/v1/admin/instances/${instanceId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...body, confirmCapacity }),
  });
}

export function InstanceForm({
  instance,
  classTypes,
  trainings,
  coaches,
  onSaved,
  onCancelEdit,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
  onSaved?: () => void;
  onCancelEdit?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [capacityConfirmation, setCapacityConfirmation] = useState<{
    body: Record<string, unknown>;
    message: string;
  } | null>(null);
  const start = clock(instance.startAt);
  const end = clock(instance.endAt);

  async function send(body: Record<string, unknown>, confirmCapacity = false) {
    setPending(true);
    try {
      const payload = await patchInstance(instance.id, body, confirmCapacity);
      if (payload.cancelledBookingCount > 0) {
        toast.success(`Guardado. ${payload.cancelledBookingCount} reservas canceladas.`);
      } else {
        toast.success("Clase actualizada");
      }
      router.refresh();
      onSaved?.();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        setCapacityConfirmation({ body, message: error.message });
        return;
      }
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const trainingId = String(form.get("trainingId") ?? "");
    await send({
      startTime: String(form.get("startTime")),
      endTime: String(form.get("endTime")),
      classTypeId: String(form.get("classTypeId")),
      coachId: String(form.get("coachId") || "") || null,
      capacity: Number(form.get("capacity")),
      trainingId: trainingId.length > 0 ? trainingId : null,
    });
  }

  return (
    <>
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <Field label="Inicio">
        <Input name="startTime" type="time" required defaultValue={start} />
      </Field>
      <Field label="Fin">
        <Input name="endTime" type="time" required defaultValue={end} />
      </Field>
      <Field label="Tipo">
        <select name="classTypeId" required defaultValue={instance.classTypeId} className={controlClass}>
          {classTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Coach">
        <select name="coachId" defaultValue={instance.coachId ?? ""} className={controlClass}>
          <option value="">Sin coach</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Aforo">
        <Input name="capacity" type="number" min={1} required defaultValue={instance.capacity} />
      </Field>
      <Field label="Entrenamiento">
        <select name="trainingId" defaultValue={instance.trainingId ?? ""} className={controlClass}>
          <option value="">Ninguno</option>
          {trainings.map((training) => (
            <option key={training.id} value={training.id}>
              {training.name}
            </option>
          ))}
        </select>
      </Field>
      <DialogFooter>
        {onCancelEdit ? (
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={onCancelEdit}>
            Cancelar edición
          </Button>
        ) : null}
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
      </form>
      <ConfirmDialog
        open={capacityConfirmation !== null}
        onOpenChange={(open) => { if (!open) setCapacityConfirmation(null); }}
        title="Confirmar cambio de aforo"
        description={capacityConfirmation
          ? `${capacityConfirmation.message}. Si continúas, se cancelarán todas las reservas de esta clase y se devolverá el cupo.`
          : ""}
        confirmLabel="Cancelar reservas y guardar"
        confirmVariant="destructive"
        busyLabel="Guardando…"
        busy={pending}
        onConfirm={() => {
          if (!capacityConfirmation) return;
          const { body } = capacityConfirmation;
          setCapacityConfirmation(null);
          void send(body, true);
        }}
      />
    </>
  );
}

export function InstanceCancelButton({ instanceId, bookedCount }: { instanceId: string; bookedCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const bookingLine =
    bookedCount === 0
      ? "No hay reservas activas."
      : bookedCount === 1
        ? "Se cancelará 1 reserva y el cupo vuelve."
        : `Se cancelarán ${bookedCount} reservas y el cupo vuelve.`;

  async function cancelClass() {
    setPending(true);
    try {
      const payload = await patchInstance(instanceId, { status: "cancelled" });
      if (payload.cancelledBookingCount > 0) {
        toast.success(`Clase cancelada. ${payload.cancelledBookingCount} reservas canceladas.`);
      } else {
        toast.success("Clase cancelada");
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la clase");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogTrigger
        render={<Button type="button" variant="destructive" className="min-h-11 shrink-0" disabled={pending} />}
      >
        Cancelar clase
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar esta clase?</DialogTitle>
          <DialogDescription>{bookingLine} La clase dejará de estar disponible para nuevas reservas.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
            Volver
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={pending}
            onClick={() => void cancelClass()}
          >
            {pending ? "Cancelando…" : "Cancelar clase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InstanceRecoverButton({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function recoverClass() {
    setPending(true);
    try {
      await patchInstance(instanceId, { status: "scheduled" });
      toast.success("Clase recuperada");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo recuperar la clase");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogTrigger render={<Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={pending} />}>
        Recuperar clase
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Recuperar esta clase?</DialogTitle>
          <DialogDescription>
            Vuelve a estar disponible para reservas. Las reservas que se cancelaron al dar de baja la clase no se
            restauran solas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
            Volver
          </DialogClose>
          <Button type="button" className="min-h-11" disabled={pending} onClick={() => void recoverClass()}>
            {pending ? "Recuperando…" : "Recuperar clase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InstanceDetailActions({
  instance,
  classTypes,
  trainings,
  coaches,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <InstanceEditDialog instance={instance} classTypes={classTypes} trainings={trainings} coaches={coaches} />
      {instance.status === "scheduled" ? (
        <InstanceCancelButton instanceId={instance.id} bookedCount={instance.bookedCount} />
      ) : (
        <InstanceRecoverButton instanceId={instance.id} />
      )}
    </div>
  );
}

export function ExtraClassForm({
  defaultDate,
  classTypes,
  coaches,
}: {
  defaultDate: string;
  classTypes: ClassType[];
  coaches: Coach[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const created = await api<{ id: string }>("/api/v1/admin/instances", {
        method: "POST",
        body: JSON.stringify({
          date: String(form.get("date")),
          startTime: String(form.get("startTime")),
          endTime: String(form.get("endTime")),
          classTypeId: String(form.get("classTypeId")),
          coachId: String(form.get("coachId") || "") || null,
          capacity: Number(form.get("capacity")),
        }),
      });
      toast.success("Clase extra creada");
      setOpen(false);
      router.push(`/staff/clases/${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  return (
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        busy={pending}
        trigger={<Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={classTypes.length === 0}>Añadir clase extra</Button>}
        title="Añadir clase extra"
        description="Fuera de la plantilla semanal. Elegí el día (también más allá del horizonte de Semana)."
      >
        <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
          <Field label="Día">
            <Input name="date" type="date" required defaultValue={defaultDate} />
          </Field>
          <Field label="Inicio">
            <Input name="startTime" type="time" required defaultValue="18:00" />
          </Field>
          <Field label="Fin">
            <Input name="endTime" type="time" required defaultValue="19:00" />
          </Field>
          <Field label="Tipo">
            <select name="classTypeId" required className={controlClass}>
              {classTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Coach">
            <select name="coachId" className={controlClass} defaultValue="">
              <option value="">Sin coach</option>
              {coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.name}</option>)}
            </select>
          </Field>
          <Field label="Aforo">
            <Input name="capacity" type="number" min={1} required defaultValue={12} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending || classTypes.length === 0}>
              {pending ? "Creando…" : "Añadir clase"}
            </Button>
          </DialogFooter>
        </form>
      </FormDialog>
  );
}

export function InstanceEditDialog({
  instance,
  classTypes,
  trainings,
  coaches,
}: {
  instance: EditableInstance;
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Editar clase"
      description="Hora, tipo, coach, aforo o entrenamiento."
      trigger={
        <Button type="button" variant="outline" className="min-h-11 shrink-0">
          Editar
        </Button>
      }
    >
      <InstanceForm
        instance={instance}
        classTypes={classTypes}
        trainings={trainings}
        coaches={coaches}
        onSaved={() => setOpen(false)}
        onCancelEdit={() => setOpen(false)}
      />
    </FormDialog>
  );
}

function clock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
