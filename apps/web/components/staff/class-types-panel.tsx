"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Field, controlClass } from "@/components/staff/field";
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

type ClassType = { id: string; name: string; kind: "directed" | "open"; imageUrl: string };

export function ClassTypesPanel({ types }: { types: ClassType[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    try {
      await api("/api/v1/admin/class-types", { method: "POST", body: new FormData(form) });
      toast.success("Tipo creado");
      form.reset();
      setOpen(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">Tipos de clase</h2>
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) setOpen(nextOpen); }}>
          <DialogTrigger render={<Button className="min-h-11" />}>Crear tipo</DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear tipo de clase</DialogTitle>
              <DialogDescription>Elegí el nombre, la grilla y la imagen que se verá en el calendario.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(event) => void onCreate(event)} className="flex flex-col gap-4">
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
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={pending} className="min-h-11">
                  {pending ? "Subiendo…" : "Crear tipo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {types.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay tipos de clase.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {types.map((type) => (
            <li key={type.id} className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={type.imageUrl} alt="" className="size-12 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{type.name}</p>
                <p className="text-sm text-muted-foreground">{type.kind === "directed" ? "Dirigida" : "Open"}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => void onDelete(type.id)}>
                Borrar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
