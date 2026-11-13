
import { useState } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/box/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/dialogs/confirm-dialog";

type DeleteConfirmation = { mode: "delete" | "detach"; description: string };

export function TrainingDeleteButton({ trainingId }: { trainingId: string }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [confirmation, setConfirmation] = useState<DeleteConfirmation | null>(null);

  async function remove(confirmDetach = false) {
    if (!begin()) return;
    try {
      await api(
        `/api/v1/admin/trainings/${trainingId}${confirmDetach ? "?confirmDetach=true" : ""}`,
        { method: "DELETE" },
      );
      setConfirmation(null);
      toast.success("Entrenamiento borrado");
      router.push("/staff/biblioteca");
      router.refresh("training");
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
      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => { if (!open) setConfirmation(null); }}
        busy={pending}
        title={confirmation?.mode === "detach" ? "Quitar el plan de las clases" : "Borrar entrenamiento"}
        description={confirmation?.description ?? ""}
        confirmLabel={confirmation?.mode === "detach" ? "Borrar y quitar el plan" : "Borrar entrenamiento"}
        confirmVariant="destructive"
        busyLabel="Borrando…"
        onConfirm={confirmDelete}
      />
    </>
  );
}
