"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/staff/field";

export function HoursForm({ openTime, closeTime }: { openTime: string; closeTime: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await api("/api/v1/admin/hours", {
        method: "PATCH",
        body: JSON.stringify({
          openTime: String(form.get("openTime")),
          closeTime: String(form.get("closeTime")),
        }),
      });
      toast.success("Horario actualizado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex max-w-sm flex-col gap-4">
      <Field label="Apertura">
        <Input name="openTime" type="time" required defaultValue={openTime} />
      </Field>
      <Field label="Cierre">
        <Input name="closeTime" type="time" required defaultValue={closeTime} />
      </Field>
      <Button type="submit" className="min-h-11" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
