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
import { ModulePrimaryAction } from "@/components/member/module-page";

type ClassType = { id: string; name: string; kind: "directed" | "open"; imageUrl: string };

function kindName(kind: ClassType["kind"]): string {
  return kind === "directed" ? "Dirigida" : "Open";
}

export function ClassTypesPanel({ types }: { types: ClassType[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassType | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(type: ClassType) {
    setEditing(type);
    setOpen(true);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    try {
      if (editing) {
        await api(`/api/v1/admin/class-types/${editing.id}`, { method: "PATCH", body: data });
        toast.success("Tipo actualizado");
      } else {
        await api("/api/v1/admin/class-types", { method: "POST", body: data });
        toast.success("Tipo creado");
        form.reset();
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : editing ? "No se pudo guardar" : "No se pudo crear");
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
    <section className="flex flex-col gap-3">
      <ModulePrimaryAction>
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (pending) return;
            setOpen(nextOpen);
            if (!nextOpen) setEditing(null);
          }}
        >
          <DialogTrigger
            render={
              <Button type="button" variant="outline" className="min-h-11" onClick={openCreate} />
            }
          >
            Crear tipo
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar tipo de clase" : "Crear tipo de clase"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Podés cambiar el nombre y la imagen. La grilla no se cambia."
                  : "Elegí el nombre, la grilla y la imagen que se verá en el calendario."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
              <Field label="Nombre">
                <Input name="name" required defaultValue={editing?.name ?? ""} />
              </Field>
              {editing ? (
                <Field label="Grilla">
                  <p className="text-sm text-muted-foreground">{kindName(editing.kind)} · no se cambia</p>
                </Field>
              ) : (
                <Field label="Grilla">
                  <select name="kind" required className={controlClass} defaultValue="directed">
                    <option value="directed">Dirigida</option>
                    <option value="open">Open</option>
                  </select>
                </Field>
              )}
              <Field label="Imagen">
                <Input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required={!editing}
                />
                {editing ? (
                  <p className="text-xs text-muted-foreground">Dejá vacío para mantener la imagen actual.</p>
                ) : null}
              </Field>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={pending} className="min-h-11">
                  {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear tipo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </ModulePrimaryAction>
      {types.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay tipos de clase.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {types.map((type) => (
            <li
              key={type.id}
              className="relative flex min-w-0 items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10"
            >
              <button
                type="button"
                onClick={() => openEdit(type)}
                aria-label={`Editar ${type.name}`}
                className="absolute inset-0 z-0 rounded-lg focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none [@media(hover:hover)_and_(pointer:fine)]:hover:ring-1 [@media(hover:hover)_and_(pointer:fine)]:hover:ring-foreground/25"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={type.imageUrl}
                alt=""
                className="pointer-events-none relative size-12 shrink-0 rounded-md object-cover"
              />
              <span className="pointer-events-none relative min-w-0 flex-1">
                <span className="block truncate font-medium">{type.name}</span>
                <span className="block text-sm text-muted-foreground">{kindName(type.kind)}</span>
              </span>
              <Button type="button" variant="ghost" className="relative z-10" onClick={() => void onDelete(type.id)}>
                Borrar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
