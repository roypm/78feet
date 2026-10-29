"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";

type ClassType = { id: string; name: string; kind: "directed" | "open" };
type Training = { id: string; name: string; classTypeId: string };
type Coach = { id: string; name: string };

export function InstanceForm({
  instance,
  classTypes,
  trainings,
  coaches,
}: {
  instance: {
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
  classTypes: ClassType[];
  trainings: Training[];
  coaches: Coach[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const start = clock(instance.startAt);
  const end = clock(instance.endAt);

  async function send(body: Record<string, unknown>, confirmCapacity = false) {
    setPending(true);
    try {
      const payload = await api<{ cancelledBookingCount: number }>(`/api/v1/admin/instances/${instance.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...body, confirmCapacity }),
      });
      if (payload.cancelledBookingCount > 0) {
        toast.success(`Guardado. ${payload.cancelledBookingCount} reservas canceladas.`);
      } else {
        toast.success("Clase actualizada");
      }
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        const ok = window.confirm(
          `${error.message}. ¿Cancelar todas las reservas de esta clase?`,
        );
        if (ok) await send(body, true);
        else toast.error(error.message);
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
      <Button type="submit" className="min-h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {instance.status === "scheduled" ? (
        <Button
          type="button"
          variant="destructive"
          className="min-h-11"
          disabled={pending}
          onClick={() => void send({ status: "cancelled" })}
        >
          Cancelar clase
        </Button>
      ) : (
        <p className="text-sm text-destructive">Esta clase está cancelada.</p>
      )}
    </form>
  );
}

export function ExtraClassForm({
  date,
  classTypes,
  coaches,
}: {
  date: string;
  classTypes: ClassType[];
  coaches: Coach[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const created = await api<{ id: string }>("/api/v1/admin/instances", {
        method: "POST",
        body: JSON.stringify({
          date,
          startTime: String(form.get("startTime")),
          endTime: String(form.get("endTime")),
          classTypeId: String(form.get("classTypeId")),
          coachId: String(form.get("coachId") || "") || null,
          capacity: Number(form.get("capacity")),
        }),
      });
      toast.success("Clase extra creada");
      router.push(`/staff/clases/${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <Field label="Inicio">
        <Input name="startTime" type="time" required defaultValue="18:00" />
      </Field>
      <Field label="Fin">
        <Input name="endTime" type="time" required defaultValue="19:00" />
      </Field>
      <Field label="Tipo">
        <select name="classTypeId" required className={controlClass}>
          {classTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Coach">
        <select name="coachId" className={controlClass} defaultValue="">
          <option value="">Sin coach</option>
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Aforo">
        <Input name="capacity" type="number" min={1} required defaultValue={12} />
      </Field>
      <Button type="submit" className="min-h-11" disabled={pending || classTypes.length === 0}>
        {pending ? "Creando…" : "Añadir clase extra"}
      </Button>
    </form>
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
