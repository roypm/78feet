"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { patchInstance } from "@/lib/box/instance-mutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function InstanceCancelButton({ instanceId, bookedCount }: { instanceId: string; bookedCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const bookingLine =
    bookedCount === 0
      ? "No hay reservas activas."
      : bookedCount === 1
        ? "Se cancelará 1 reserva y el cupo vuelve."
        : `Se cancelarán ${bookedCount} reservas y el cupo vuelve.`;

  async function cancelClass() {
    setPending(true);
    try {
      const payload = await patchInstance(instanceId, { status: "cancelled" });
      if (payload.cancelledBookingCount > 0) {
        toast.success(`Clase cancelada. ${payload.cancelledBookingCount} reservas canceladas.`);
      } else {
        toast.success("Clase cancelada");
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la clase");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogTrigger
        render={<Button type="button" variant="destructive" className="min-h-11 shrink-0" disabled={pending} />}
      >
        Cancelar clase
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Cancelar esta clase?</DialogTitle>
          <DialogDescription>{bookingLine} La clase dejará de estar disponible para nuevas reservas.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
            Volver
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={pending}
            onClick={() => void cancelClass()}
          >
            {pending ? "Cancelando…" : "Cancelar clase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InstanceRecoverButton({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function recoverClass() {
    setPending(true);
    try {
      await patchInstance(instanceId, { status: "scheduled" });
      toast.success("Clase recuperada");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo recuperar la clase");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) setOpen(next); }}>
      <DialogTrigger render={<Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={pending} />}>
        Recuperar clase
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Recuperar esta clase?</DialogTitle>
          <DialogDescription>
            Vuelve a estar disponible para reservas. Las reservas que se cancelaron al dar de baja la clase no se
            restauran solas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" className="min-h-11" disabled={pending} />}>
            Volver
          </DialogClose>
          <Button type="button" className="min-h-11" disabled={pending} onClick={() => void recoverClass()}>
            {pending ? "Recuperando…" : "Recuperar clase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
