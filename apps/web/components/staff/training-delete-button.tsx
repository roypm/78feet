"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/staff/form-dialog";

type DeleteConfirmation = { mode: "delete" | "detach"; description: string };

export function TrainingDeleteButton({ trainingId }: { trainingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<DeleteConfirmation | null>(null);

  async function remove(confirmDetach = false) {
    setPending(true);
    try {
      await api(
        `/api/v1/admin/trainings/${trainingId}${confirmDetach ? "?confirmDetach=true" : ""}`,
        { method: "DELETE" },
      );
      setConfirmation(null);
      toast.success("Entrenamiento borrado");
      router.push("/staff/biblioteca");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CONFIRM_REQUIRED") {
        setConfirmation({
          mode: "detach",
          description: `${error.message}. Las reservas no cambiarán.`,
        });
      } else {
        toast.error(error instanceof Error ? error.message : "No se pudo borrar");
      }
    } finally {
      setPending(false);
    }
  }

  function confirmDelete() {
    if (!confirmation) return;
    void remove(confirmation.mode === "detach");
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className="min-h-11"
        disabled={pending}
        onClick={() => setConfirmation({
          mode: "delete",
          description: "El entrenamiento se quitará de las clases que lo tengan asignado. Las reservas no cambiarán.",
        })}
      >
        Borrar entrenamiento
      </Button>
      <FormDialog
        open={confirmation !== null}
        onOpenChange={(open) => { if (!open && !pending) setConfirmation(null); }}
        busy={pending}
        title={confirmation?.mode === "detach" ? "Quitar el plan de las clases" : "Borrar entrenamiento"}
        description={confirmation?.description ?? ""}
      >
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setConfirmation(null)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" className="min-h-11" disabled={pending} onClick={confirmDelete}>
            {pending ? "Borrando…" : confirmation?.mode === "detach" ? "Borrar y quitar el plan" : "Borrar entrenamiento"}
          </Button>
        </DialogFooter>
      </FormDialog>
    </>
  );
}
