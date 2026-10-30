"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";

export function BookButton({ instanceId }: { instanceId: string }) {
  const { router, pending, begin, setPending } = useActionFeedback();

  async function reserve() {
    if (!begin()) return;
    try {
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instanceId }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        toast.error(payload.error?.message ?? "No se pudo reservar");
        return;
      }
      toast.success("Reserva confirmada");
      router.push("/calendario");
    } catch {
      toast.error("No se pudo reservar");
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
