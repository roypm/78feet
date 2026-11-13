import { PendingButton } from "@/components/common/feedback/pending-button";

import { useActionFeedback } from "@/hooks/use-action-feedback";
import { api } from "@/lib/box/api";
import { toast } from "sonner";

export function BookButton({ instanceId }: { instanceId: string }) {
  const { router, pending, begin, setPending } = useActionFeedback();

  async function reserve() {
    if (!begin()) return;
    try {
      await api("/api/v1/bookings", {
        method: "POST",
        body: JSON.stringify({ instanceId }),
      });
      toast.success("Reserva confirmada");
      void router.refresh("booking");
      void router.push("/calendario");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reservar");
    } finally {
      setPending(false);
    }
  }

  return (
    <PendingButton type="button" className="min-h-11 w-full" disabled={pending} onClick={() => void reserve()} pending={pending} pendingLabel={"Reservando…"}>
      {"Reservar"}
    </PendingButton>
  );
}
