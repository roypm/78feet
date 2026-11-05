"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import type { BoxSummary } from "@/lib/box/boxes";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/staff/form-control";
import { PendingButton } from "@/components/feedback/pending-button";
import { ModulePrimaryAction } from "@/components/member/module-page";

function BoxRenameRow({ box }: { box: BoxSummary }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [draft, setDraft] = useState(box.name);

  useEffect(() => {
    setDraft(box.name);
  }, [box.name]);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/boxes/${box.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: draft }),
      });
      toast.success("Sede renombrada");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo renombrar");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <form onSubmit={(event) => void rename(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormInput
          label="Nombre"
          name={`name-${box.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          required
          maxLength={40}
        />
        <PendingButton
          type="submit"
          variant="outline"
          className="min-h-11"
          pending={pending}
          pendingLabel="Guardando…"
          disabled={pending || draft.trim() === box.name}
        >
          Renombrar
        </PendingButton>
      </form>
    </li>
  );
}

export function BoxesPanel({ boxes }: { boxes: BoxSummary[] }) {
  const { router, pending, begin, setPending } = useActionFeedback();

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!begin()) return;
    try {
      await api<{ id: string }>("/api/v1/admin/boxes", {
        method: "POST",
        body: JSON.stringify({ name: String(data.get("name")) }),
      });
      toast.success("Sede creada");
      form.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la sede");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-labelledby="new-box-title">
        <h2 id="new-box-title" className="text-sm font-medium">
          Nueva sede
        </h2>
        <ModulePrimaryAction>
          <form onSubmit={(event) => void create(event)} className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-end">
            <FormInput label="Nombre" name="name" required maxLength={40} placeholder="Nombre de la sede" />
            <Button type="submit" className="min-h-11" disabled={pending}>
              Añadir sede
            </Button>
          </form>
        </ModulePrimaryAction>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="boxes-list-title">
        <h2 id="boxes-list-title" className="text-sm font-medium">
          Sedes ({boxes.length})
        </h2>
        <ul className="flex flex-col gap-3">
          {boxes.map((box) => (
            <BoxRenameRow key={box.id} box={box} />
          ))}
        </ul>
      </section>
    </div>
  );
}
