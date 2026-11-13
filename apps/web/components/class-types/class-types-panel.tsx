import { PendingButton } from "@/components/common/feedback/pending-button";
import { ClassTypeThumb } from "@/components/class-types/class-type-thumb";

import { ListEmptyBlock } from "@/components/common/lists/list-empty-block";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Field } from "@/components/common/forms/field";
import { FormInput } from "@/components/common/forms/form-control";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { FormSelect } from "@/components/common/forms/form-select";
import { ImageUploadField } from "@/components/common/forms/image-upload-field";
import { ModulePrimaryAction } from "@/components/common/layout/module-page";
import { ConfirmDialog } from "@/components/common/dialogs/confirm-dialog";

type ClassType = { id: string; name: string; kind: "directed" | "open"; imageUrl: string | null };

function kindName(kind: ClassType["kind"]): string {
  return kind === "directed" ? "Dirigida" : "Open";
}

export function ClassTypesPanel({ types }: { types: ClassType[] }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassType | null>(null);
  const [deleting, setDeleting] = useState<ClassType | null>(null);

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
    if (!begin()) return;
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
      router.refresh("catalog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : editing ? "No se pudo guardar" : "No se pudo crear");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!deleting) return;
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/class-types/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      toast.success("Tipo borrado");
      router.refresh("catalog");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo borrar");
    } finally {
      setPending(false);
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
          <DialogContent aria-busy={pending} showCloseButton={!pending} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar tipo de clase" : "Crear tipo de clase"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Podés cambiar el nombre y la imagen. La grilla no se cambia. La imagen no es obligatoria."
                  : "Elegí el nombre y la grilla. La imagen es opcional; sin foto, el bloque muestra el nombre del tipo."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <FormInput label="Nombre" name="name" required defaultValue={editing?.name ?? ""} />
          {editing ? (
            <Field label="Grilla">
              <p className="text-sm text-muted-foreground">{kindName(editing.kind)} · no se cambia</p>
            </Field>
          ) : (
            <FormSelect
              label="Grilla" name="kind" required disabled={pending} defaultValue=""
              options={[{ value: "", label: "Elegí una grilla…" }, { value: "directed", label: "Dirigida" }, { value: "open", label: "Open" }]}
            />
          )}
          <ImageUploadField key={editing?.id ?? "new"} currentImageUrl={editing?.imageUrl ?? undefined} disabled={pending} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
              Cancelar
            </DialogClose>
            <PendingButton type="submit" disabled={pending} className="min-h-11" pending={pending} pendingLabel={"Guardando…"}>
              {editing ? "Guardar cambios" : "Crear tipo"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
          </DialogContent>
        </Dialog>
      </ModulePrimaryAction>
      {types.length === 0 ? (
        <ListEmptyBlock title="Todavía no hay tipos de clase" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
          <Table className="min-w-[28rem]">
            <TableHeader>
              <TableRow className="pointer-hover:bg-transparent">
                <TableHead className="h-10 min-w-[12rem] px-3">Tipo de clase</TableHead>
                <TableHead className="h-10 min-w-[6rem] px-3">Grilla</TableHead>
                <TableHead className="h-10 w-0 px-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id} className="border-border">
                  <TableCell className="min-w-[12rem] max-w-[24rem] px-3 py-2.5 align-middle">
                    <div className="flex min-w-0 items-center gap-3">
                      <ClassTypeThumb imageUrl={type.imageUrl} className="size-10 shrink-0 rounded-md" />
                      <span className="min-w-0 truncate font-medium" title={type.name}>{type.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2.5 align-middle text-sm text-muted-foreground">
                    {kindName(type.kind)}
                  </TableCell>
                  <TableCell className="w-0 whitespace-nowrap px-3 py-2.5 align-middle text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" className="min-h-11 sm:min-h-8"
                        disabled={pending} aria-label={`Editar ${type.name}`} onClick={() => openEdit(type)}>
                        Editar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="min-h-11 sm:min-h-8"
                        disabled={pending} aria-label={`Borrar ${type.name}`} onClick={() => setDeleting(type)}>
                        Borrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}
        title="Borrar tipo de clase"
        description={deleting ? `¿Borrar «${deleting.name}»?` : ""}
        confirmLabel="Borrar tipo"
        confirmVariant="destructive"
        busyLabel="Borrando…"
        busy={pending}
        onConfirm={() => void onDelete()}
      />
    </section>
  );
}
