"use client";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import type { BoxSummary } from "@/lib/box/boxes";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormInput } from "@/components/common/forms/form-control";
import { FormActions } from "@/components/common/forms/form-actions";
import { FormDialog } from "@/components/common/dialogs/form-dialog";
import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";
import { ModulePrimaryAction } from "@/components/common/layout/module-page";

export function BoxesPanel({ boxes }: { boxes: BoxSummary[] }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BoxSummary | null>(null);

  function showForm(box: BoxSummary | null) {
    setEditing(box);
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!begin()) return;
    try {
      await api(editing ? `/api/v1/admin/boxes/${editing.id}` : "/api/v1/admin/boxes", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ name: String(data.get("name")) }),
      });
      toast.success(editing ? "Sede renombrada" : "Sede creada");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la sede");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <ModulePrimaryAction>
        <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => showForm(null)}>
          Añadir sede
        </Button>
      </ModulePrimaryAction>
      {boxes.length === 0 ? (
        <ListEmptyBlock title="Todavía no hay sedes" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
          <Table className="min-w-[20rem]">
            <TableHeader>
              <TableRow className="pointer-hover:bg-transparent">
                <TableHead className="h-10 min-w-[12rem] px-3">Sede</TableHead>
                <TableHead className="h-10 w-0 px-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boxes.map((box) => (
                <TableRow key={box.id} className="border-border">
                  <TableCell className="min-w-[12rem] max-w-[24rem] px-3 py-2.5 align-middle">
                    <span className="block truncate font-medium" title={box.name}>{box.name}</span>
                  </TableCell>
                  <TableCell className="w-0 whitespace-nowrap px-3 py-2.5 align-middle text-right">
                    <Button type="button" variant="outline" size="sm" className="min-h-11 sm:min-h-8"
                      disabled={pending} aria-label={`Renombrar ${box.name}`} onClick={() => showForm(box)}>
                      Renombrar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <FormDialog open={open} onOpenChange={setOpen} busy={pending}
        title={editing ? "Renombrar sede" : "Añadir sede"}
        description={editing ? "El cambio de nombre no modifica su horario, plantilla ni reservas." : "La sede nace con plantilla vacía y horario de 07:00 a 21:00."}>
        <form key={editing ? `${editing.id}:${editing.name}` : "new"} onSubmit={(event) => void save(event)} className="flex flex-col gap-4">
          <fieldset disabled={pending} aria-busy={pending} className="contents">
            <FormInput label="Nombre" name="name" required maxLength={40} defaultValue={editing?.name ?? ""} />
            <FormActions pending={pending} onCancel={() => setOpen(false)}
              submitLabel={editing ? "Guardar cambios" : "Añadir sede"} />
          </fieldset>
        </form>
      </FormDialog>
    </section>
  );
}
