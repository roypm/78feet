import { PendingButton } from "@/components/common/feedback/pending-button";

import { useState } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { api } from "@/lib/box/api";
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
      await api(`/api/v1/bookings/${bookingId}`, { method: "DELETE" });
      toast.success("Reserva cancelada");
      setOpen(false);
      void router.refresh("booking");
      void router.push(nextHref);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar");
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
