import type { ReactElement } from "react";

import { PendingButton } from "@/components/common/feedback/pending-button";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/common/dialogs/form-dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  busy = false,
  confirmVariant = "default",
  cancelLabel = "Cancelar",
  busyLabel = "Procesando…",
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  busy?: boolean;
  confirmVariant?: "default" | "destructive";
  cancelLabel?: string;
  busyLabel?: string;
  trigger?: ReactElement;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      busy={busy}
      trigger={trigger}
    >
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </Button>
        <PendingButton
          type="button"
          variant={confirmVariant}
          className="h-auto min-h-11 min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]"
          disabled={busy}
          onClick={onConfirm}
          pending={busy}
          pendingLabel={busyLabel}
        >
          {confirmLabel}
        </PendingButton>
      </DialogFooter>
    </FormDialog>
  );
}
