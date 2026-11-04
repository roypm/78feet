"use client";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/staff/form-control";
import { PendingButton } from "@/components/feedback/pending-button";

export function BoxAdmin({ boxId, name }: { boxId: string; name: string }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [draft, setDraft] = useState(name);

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/boxes/${boxId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: draft }),
      });
      toast.success("Box renombrado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo renombrar");
    } finally {
      setPending(false);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!begin()) return;
    try {
      const created = await api<{ id: string }>("/api/v1/admin/boxes", {
        method: "POST",
        body: JSON.stringify({ name: String(form.get("name")) }),
      });
      toast.success("Box creado");
      event.currentTarget.reset();
      router.push(`/staff/horario?box=${created.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el box");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(event) => void rename(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormInput label="Nombre del box" name="rename" value={draft} onChange={(event) => setDraft(event.target.value)} required maxLength={40} />
        <PendingButton type="submit" variant="outline" className="min-h-11" pending={pending} pendingLabel="Guardando…" disabled={pending || draft.trim() === name}>
          Renombrar
        </PendingButton>
      </form>
      <form onSubmit={(event) => void create(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormInput label="Nuevo box" name="name" required maxLength={40} placeholder="Nombre" />
        <Button type="submit" className="min-h-11" disabled={pending}>
          Añadir box
        </Button>
      </form>
    </div>
  );
}
