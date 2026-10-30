"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/staff/form-dialog";

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
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      busy={busy}
    >
      <DialogFooter>
        <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button type="button" variant={confirmVariant} className="min-h-11" disabled={busy} onClick={onConfirm}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </DialogFooter>
    </FormDialog>
  );
}
