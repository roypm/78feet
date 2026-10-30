"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useState } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
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

export function CancelBookingButton({
  bookingId,
  nextHref,
}: {
  bookingId: string;
  nextHref: "/calendario" | "/reservas";
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);

  async function cancel() {
    if (!begin()) return;
    try {
      const response = await fetch(`/api/v1/bookings/${bookingId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        toast.error(payload.error?.message ?? "No se pudo cancelar");
        return;
      }
      toast.success("Reserva cancelada");
      setOpen(false);
      router.push(nextHref);
    } catch {
      toast.error("No se pudo cancelar");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogTrigger render={<Button variant="outline" className="min-h-11 w-full" disabled={pending} />}>
        Cancelar
      </DialogTrigger>
      <DialogContent aria-busy={pending} showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>¿Cancelar esta reserva?</DialogTitle>
          <DialogDescription>El cupo vuelve.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" className="min-h-11" disabled={pending} />}>Volver</DialogClose>
          <PendingButton
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={pending}
            onClick={() => void cancel()}
           pending={pending} pendingLabel={"Cancelando…"}>
            {"Cancelar reserva"}
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
