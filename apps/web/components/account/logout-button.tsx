"use client";

import { PendingButton } from "@/components/common/feedback/pending-button";
import { LogOut } from "lucide-react";

import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";

export function LogoutButton() {
  const { applyTheme } = useTheme();
  const { router, pending, begin, setPending } = useActionFeedback();

  async function logout() {
    if (!begin()) return;
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("No se pudo cerrar la sesión");
      applyTheme("system");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("No se pudo cerrar la sesión. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <PendingButton
      type="button"
      variant="outline"
      className="min-h-11 w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:p-2"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      disabled={pending}
      onClick={() => void logout()}
      pending={pending}
      pendingLabel={<span className="group-data-[collapsible=icon]:hidden">Saliendo…</span>}
    >
      <span className="inline-flex items-center gap-2">
        <LogOut data-icon="inline-start" />
        <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
      </span>
    </PendingButton>
  );
}
