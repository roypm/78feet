"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ApplyTemplateDialog({
  open,
  onOpenChange,
  effectiveFrom,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  effectiveFrom: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent aria-busy={pending} showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>¿Aplicar plantilla?</DialogTitle>
          <DialogDescription>
            Los cambios rigen desde el {effectiveFrom}. La semana en curso no se toca. Las clases futuras del horario se
            actualizarán; si cambia la hora, el tipo o desaparece un hueco, las reservas pueden cancelarse o moverse. Bajar
            el aforo por debajo de los apuntados cancela todas las reservas de esa clase. Las excepciones ya hechas en
            instancias concretas no se sobrescriben.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
            Volver
          </DialogClose>
          <PendingButton type="button" className="min-h-11" disabled={pending} onClick={onConfirm} pending={pending} pendingLabel={"Aplicando…"}>
            {"Aplicar plantilla"}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
