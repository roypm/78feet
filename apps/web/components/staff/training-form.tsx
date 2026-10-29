"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, controlClass } from "@/components/staff/field";

type Phase = { name: string; blocks: { body: string }[] };

export function TrainingForm({
  types,
  training,
}: {
  types: { id: string; name: string }[];
  training?: {
    id: string;
    name: string;
    classTypeId: string;
    phases: { name: string; blocks: { body: string }[] }[];
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [phases, setPhases] = useState<Phase[]>(
    training?.phases ?? [{ name: "Warmup", blocks: [{ body: "" }] }],
  );

  async function save(confirmDetach = false) {
    const body = {
      name: (document.getElementById("training-name") as HTMLInputElement | null)?.value,
      classTypeId: (document.getElementById("training-type") as HTMLSelectElement | null)?.value,
      phases,
      confirmDetach,
    };
    const path = training ? `/api/v1/admin/trainings/${training.id}` : "/api/v1/admin/trainings";
    const result = await api<{ training?: { id: string }; id?: string; detachedCount?: number }>(path, {
      method: training ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    const id = training?.id ?? result.training?.id ?? result.id;
    toast.success(result.detachedCount ? `Guardado. ${result.detachedCount} clases se quedan sin plan.` : "Guardado");
    router.push(`/staff/biblioteca/${id}`);
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await save(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        const ok = window.confirm(`${error.message}. ¿Seguir?`);
        if (ok) await save(true);
      } else {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!training) return;
    if (!window.confirm("¿Borrar este entrenamiento?")) return;
    setPending(true);
    try {
      await api(`/api/v1/admin/trainings/${training.id}`, { method: "DELETE" });
      toast.success("Entrenamiento borrado");
      router.push("/staff/biblioteca");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        const ok = window.confirm(`${error.message}. ¿Borrar igual?`);
        if (ok) {
          await api(`/api/v1/admin/trainings/${training.id}?confirmDetach=true`, { method: "DELETE" });
          toast.success("Entrenamiento borrado");
          router.push("/staff/biblioteca");
          router.refresh();
        }
      } else {
        toast.error(error instanceof Error ? error.message : "No se pudo borrar");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-6">
      <Field label="Nombre">
        <Input id="training-name" name="name" required defaultValue={training?.name} />
      </Field>
      <Field label="Tipo">
        <select id="training-type" name="classTypeId" required className={controlClass} defaultValue={training?.classTypeId}>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>
      {phases.map((phase, phaseIndex) => (
        <section key={phaseIndex} className="flex flex-col gap-3 rounded-lg bg-card p-4 ring-1 ring-foreground/10">
          <Field label="Fase">
            <Input
              value={phase.name}
              onChange={(event) => {
                const next = [...phases];
                next[phaseIndex] = { ...phase, name: event.target.value };
                setPhases(next);
              }}
              required
            />
          </Field>
          {phase.blocks.map((block, blockIndex) => (
            <Field key={blockIndex} label="Bloque">
              <Textarea
                rows={4}
                value={block.body}
                onChange={(event) => {
                  const next = [...phases];
                  const blocks = [...phase.blocks];
                  blocks[blockIndex] = { body: event.target.value };
                  next[phaseIndex] = { ...phase, blocks };
                  setPhases(next);
                }}
                required
              />
            </Field>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = [...phases];
              next[phaseIndex] = { ...phase, blocks: [...phase.blocks, { body: "" }] };
              setPhases(next);
            }}
          >
            Añadir bloque
          </Button>
        </section>
      ))}
      <Button type="button" variant="secondary" onClick={() => setPhases([...phases, { name: "", blocks: [{ body: "" }] }])}>
        Añadir fase
      </Button>
      <Button type="submit" className="min-h-11" disabled={pending || types.length === 0}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {training ? (
        <Button type="button" variant="destructive" disabled={pending} onClick={() => void remove()}>
          Borrar
        </Button>
      ) : null}
    </form>
  );
}
