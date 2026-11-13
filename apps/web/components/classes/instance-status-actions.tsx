import { ConfirmDialog } from "@/components/common/dialogs/confirm-dialog";

import { useState } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { patchInstance, removeExtraInstance, restoreInstanceFromTemplate } from "@/lib/box/instance-mutations";
import { Button } from "@/components/ui/button";

export function InstanceCancelButton({ instanceId, bookedCount }: { instanceId: string; bookedCount: number }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);

  const bookingLine =
    bookedCount === 0
      ? "No hay reservas activas."
      : bookedCount === 1
        ? "Se cancelará 1 reserva y el cupo vuelve."
        : `Se cancelarán ${bookedCount} reservas y el cupo vuelve.`;

  async function cancelClass() {
    if (!begin()) return;
    try {
      const payload = await patchInstance(instanceId, { status: "cancelled" });
      if (payload.cancelledBookingCount > 0) {
        toast.success(`Clase cancelada. ${payload.cancelledBookingCount} reservas canceladas.`);
      } else {
        toast.success("Clase cancelada");
      }
      setOpen(false);
      router.refresh("schedule");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cancelar la clase");
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="destructive" className="min-h-11 shrink-0" disabled={pending}>
          Cancelar clase
        </Button>
      }
      title="¿Cancelar esta clase?"
      description={`${bookingLine} La clase dejará de estar disponible para nuevas reservas.`}
      confirmLabel="Cancelar clase"
      confirmVariant="destructive"
      cancelLabel="Volver"
      busy={pending}
      busyLabel="Cancelando…"
      onConfirm={() => void cancelClass()}
    />
  );
}

export function InstanceRecoverButton({ instanceId }: { instanceId: string }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);

  async function recoverClass() {
    if (!begin()) return;
    try {
      await patchInstance(instanceId, { status: "scheduled" });
      toast.success("Clase recuperada");
      setOpen(false);
      router.refresh("schedule");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo recuperar la clase");
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={pending}>
          Recuperar clase
        </Button>
      }
      title="¿Recuperar esta clase?"
      description="Vuelve a estar disponible para reservas. Las reservas canceladas al cancelar la clase no se reactivan; los socios tendrán que apuntarse de nuevo."
      confirmLabel="Recuperar clase"
      confirmVariant="default"
      cancelLabel="Volver"
      busy={pending}
      busyLabel="Recuperando…"
      onConfirm={() => void recoverClass()}
    />
  );
}

export function ExtraClassRemoveButton({
  instanceId,
  bookingHistoryCount,
  bookedCount,
  returnHref,
}: {
  instanceId: string;
  bookingHistoryCount: number;
  bookedCount: number;
  returnHref: string;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const description =
    bookingHistoryCount === 0
      ? "Se eliminará de la programación. Como esta clase extra nunca tuvo reservas, no hace falta conservar su ficha."
      : bookedCount > 0
        ? `Se cancelarán ${bookedCount} reservas activas y se devolverá el cupo o saldo. La ficha quedará como cancelada para conservar el historial.`
        : "Se quitará de la programación y la ficha quedará como cancelada para conservar el historial de reservas.";

  async function removeClass() {
    if (!begin()) return;
    try {
      const result = await removeExtraInstance(instanceId);
      if (result.deleted) {
        toast.success("Clase extra eliminada");
      } else if (result.cancelledBookingCount > 0) {
        toast.success(`Clase extra retirada. ${result.cancelledBookingCount} reservas canceladas y cupo devuelto.`);
      } else {
        toast.success("Clase extra retirada. Se conservó el historial de reservas.");
      }
      setOpen(false);
      router.push(returnHref);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar la clase extra");
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="destructive" className="min-h-11 shrink-0" disabled={pending}>
          Quitar clase extra
        </Button>
      }
      title="¿Quitar esta clase extra?"
      description={description}
      confirmLabel="Quitar clase extra"
      confirmVariant="destructive"
      cancelLabel="Volver"
      busy={pending}
      busyLabel="Quitando…"
      onConfirm={() => void removeClass()}
    />
  );
}

export function InstanceRestoreTemplateButton({
  instanceId,
  bookedCount,
}: {
  instanceId: string;
  bookedCount: number;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);
  const impact =
    bookedCount > 0
      ? `Hay ${bookedCount} reservas activas. Si cambia el tipo o el aforo no permite mantenerlas, se cancelarán todas y se devolverá el cupo o saldo; si solo cambia la hora, se conservarán.`
      : "Si la plantilla cambia el tipo o el aforo no permite mantener las reservas, se cancelarán y se devolverá el cupo o saldo.";

  async function restoreClass() {
    if (!begin()) return;
    try {
      const result = await restoreInstanceFromTemplate(instanceId);
      if (result.cancelledBookingCount > 0) {
        toast.success(`Clase restaurada. ${result.cancelledBookingCount} reservas canceladas y cupo devuelto.`);
      } else {
        toast.success("Clase restaurada desde la plantilla");
      }
      setOpen(false);
      router.refresh("schedule");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo restaurar la clase");
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={pending}>
          Restaurar plantilla
        </Button>
      }
      title="¿Restaurar desde la plantilla?"
      description={`Se aplicarán el horario, tipo, coach y aforo actuales de la plantilla. ${impact} Las reservas que ya estaban canceladas no se reactivan.`}
      confirmLabel="Restaurar plantilla"
      confirmVariant="default"
      cancelLabel="Volver"
      busy={pending}
      busyLabel="Restaurando…"
      onConfirm={() => void restoreClass()}
    />
  );
}
