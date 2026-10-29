"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type ClassType = { id: string; name: string; kind: "directed" | "open"; imageUrl: string };
type Template = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  classTypeName: string;
  defaultCapacity: number;
  coachId: string | null;
};
type Coach = { id: string; name: string };

export function ClassTypesPanel({ types, canWrite }: { types: ClassType[]; canWrite: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    try {
      await api("/api/v1/admin/class-types", { method: "POST", body: new FormData(form) });
      toast.success("Tipo creado");
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("¿Borrar este tipo?")) return;
    try {
      await api(`/api/v1/admin/class-types/${id}`, { method: "DELETE" });
      toast.success("Tipo borrado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo borrar");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-medium">Tipos de clase</h2>
      <ul className="flex flex-col gap-3">
        {types.map((type) => (
          <li key={type.id} className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={type.imageUrl} alt="" className="size-12 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{type.name}</p>
              <p className="text-sm text-muted-foreground">{type.kind === "directed" ? "Dirigida" : "Open"}</p>
            </div>
            {canWrite ? (
              <Button type="button" variant="ghost" onClick={() => void onDelete(type.id)}>
                Borrar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canWrite ? (
        <form onSubmit={(event) => void onCreate(event)} className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <Field label="Nombre">
            <Input name="name" required />
          </Field>
          <Field label="Grilla">
            <select name="kind" required className={controlClass} defaultValue="directed">
              <option value="directed">Dirigida</option>
              <option value="open">Open</option>
            </select>
          </Field>
          <Field label="Imagen">
            <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Subiendo…" : "Crear tipo"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

export function TemplatesPanel({
  templates,
  types,
  coaches,
  canWrite,
}: {
  templates: Template[];
  types: ClassType[];
  coaches: Coach[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/v1/admin/templates", {
        method: "POST",
        body: JSON.stringify({
          weekday: Number(form.get("weekday")),
          startTime: String(form.get("startTime")),
          endTime: String(form.get("endTime")),
          classTypeId: String(form.get("classTypeId")),
          coachId: String(form.get("coachId") || "") || null,
          defaultCapacity: Number(form.get("defaultCapacity")),
        }),
      });
      toast.success("Hueco creado. Rige desde hoy.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("¿Quitar este hueco de la plantilla? Rige desde el lunes siguiente.")) return;
    try {
      const result = await api<{ summary: { cancelledBookingCount: number } }>(`/api/v1/admin/templates/${id}`, {
        method: "DELETE",
      });
      toast.success(`Plantilla actualizada. ${result.summary.cancelledBookingCount} reservas canceladas.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo borrar");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-medium">Plantilla semanal</h2>
      {DAYS.map((label, index) => {
        const weekday = index + 1;
        const rows = templates.filter((item) => item.weekday === weekday);
        return (
          <div key={weekday} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin clases</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((row) => (
                  <li key={row.id} className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{row.classTypeName}</p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {row.startTime.slice(0, 5)}–{row.endTime.slice(0, 5)} · {row.defaultCapacity} plazas
                      </p>
                    </div>
                    {canWrite ? (
                      <Button type="button" variant="ghost" onClick={() => void onDelete(row.id)}>
                        Quitar
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {canWrite && types.length > 0 ? (
        <form onSubmit={(event) => void onCreate(event)} className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <h3 className="font-medium">Nuevo hueco</h3>
          <Field label="Día">
            <select name="weekday" required className={controlClass} defaultValue={1}>
              {DAYS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Inicio">
            <Input name="startTime" type="time" required defaultValue="18:00" />
          </Field>
          <Field label="Fin">
            <Input name="endTime" type="time" required defaultValue="19:00" />
          </Field>
          <Field label="Tipo">
            <select name="classTypeId" required className={controlClass}>
              {types.map((type) => (
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
            <Input name="defaultCapacity" type="number" min={1} required defaultValue={12} />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Añadir a la plantilla"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
