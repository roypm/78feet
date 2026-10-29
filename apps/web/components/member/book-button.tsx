"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BookButton({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function reserve() {
    setPending(true);
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
    <Button type="button" className="min-h-11 w-full" disabled={pending} onClick={() => void reserve()}>
      {pending ? "Reservando…" : "Reservar"}
    </Button>
  );
}
