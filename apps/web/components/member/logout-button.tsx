"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";

export function LogoutButton() {
  const { router, pending, begin, setPending } = useActionFeedback();

  async function logout() {
    if (!begin()) return;
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("No se pudo cerrar la sesión. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <PendingButton type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => void logout()} pending={pending} pendingLabel={"Saliendo…"}>
      {"Salir"}
    </PendingButton>
  );
}
