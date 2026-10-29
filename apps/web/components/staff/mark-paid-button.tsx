"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/box/api";
import { Button } from "@/components/ui/button";

export function MarkPaidButton({
  userId,
  month,
  amountCents,
}: {
  userId: string;
  month: string;
  amountCents: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function mark() {
    setPending(true);
    try {
      await api("/api/v1/admin/payments", {
        method: "POST",
        body: JSON.stringify({ userId, kind: "monthly", month, amountCents }),
      });
      toast.success("Pago marcado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="sm" disabled={pending} onClick={() => void mark()}>
      {pending ? "Marcando…" : "Marcar pago"}
    </Button>
  );
}
