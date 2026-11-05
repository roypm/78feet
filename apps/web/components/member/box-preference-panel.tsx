"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { api } from "@/lib/box/api";
import type { BoxSummary } from "@/lib/box/boxes";

export function BoxPreferencePanel({
  boxes,
  preferenceBoxId,
}: {
  boxes: BoxSummary[];
  preferenceBoxId: string | null;
}) {
  const [selected, setSelected] = useState(preferenceBoxId ?? boxes[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setSelected(preferenceBoxId ?? boxes[0]?.id ?? "");
  }, [preferenceBoxId, boxes]);

  if (boxes.length <= 1) return null;

  async function save(nextId: string) {
    if (nextId === selected || pending) return;
    setPending(true);
    try {
      const result = await api<{ preferenceBoxId: string | null }>("/api/v1/me/preferences", {
        method: "PATCH",
        body: JSON.stringify({ preferenceBoxId: nextId }),
      });
      setSelected(result.preferenceBoxId ?? nextId);
      toast.success("Sede por defecto actualizada");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la sede");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-lg bg-card p-4 ring-1 ring-foreground/10 md:p-6">
      <h2 className="mb-1 font-medium">Sede por defecto</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Con qué sede se abre el calendario y las pantallas del box. Elegir otra en el selector no cambia este ajuste.
      </p>
      <fieldset disabled={pending} aria-busy={pending} className="flex flex-col gap-2">
        <legend className="sr-only">Sede por defecto</legend>
        {boxes.map((box) => {
          const active = selected === box.id;
          return (
            <label key={box.id} className="min-w-0 cursor-pointer">
              <input
                type="radio"
                name="default-box"
                value={box.id}
                checked={active}
                onChange={() => void save(box.id)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                <span className="min-w-0 flex-1 truncate font-medium">{box.name}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    active ? "bg-primary text-primary-foreground" : "border border-border bg-background text-transparent",
                  )}
                >
                  {active ? <Check className="size-3.5" /> : null}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}
