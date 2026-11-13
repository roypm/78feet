import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { PendingButton } from "@/components/common/feedback/pending-button";

export function FormActions({
  pending,
  onCancel,
  submitLabel,
  pendingLabel = "Guardando…",
  cancelLabel = "Cancelar",
  submitDisabled = false,
}: {
  pending: boolean;
  onCancel?: () => void;
  submitLabel: ReactNode;
  pendingLabel?: ReactNode;
  cancelLabel?: ReactNode;
  submitDisabled?: boolean;
}) {
  return (
    <DialogFooter>
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]"
          disabled={pending}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      ) : null}
      <PendingButton
        type="submit"
        className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]"
        disabled={submitDisabled}
        pending={pending}
        pendingLabel={pendingLabel}
      >
        {submitLabel}
      </PendingButton>
    </DialogFooter>
  );
}
