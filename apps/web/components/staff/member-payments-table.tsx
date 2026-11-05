"use client";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import type { MemberPaymentRow } from "@/lib/box/payments-view";
import { paymentConceptLabel, paymentMethodLabel } from "@/lib/box/payments-view";
import { api } from "@/lib/box/api";
import { formatPrice, formatRecordedAt } from "@/lib/box/format";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/staff/confirm-dialog";
import { Field } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";
import { FormSelect } from "@/components/staff/form-select";
import { MoneyField } from "@/components/staff/numeric-field";
import { PendingButton } from "@/components/feedback/pending-button";
import { parseEuroCents } from "@/lib/ui/numbers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "bizum", label: "Bizum" },
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "TPV / tarjeta" },
  { value: "other", label: "Otro" },
] as const;

function paymentConcept(payment: MemberPaymentRow): string {
  return paymentConceptLabel(payment);
}

function PaymentEditDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: MemberPaymentRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseEuroCents(String(form.get("amountEuros") ?? ""));
    if (parsed === null) return;
    const method = String(form.get("method") ?? "").trim();
    if (!method) return;
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ amountCents: parsed, method }),
      });
      toast.success("Pago actualizado");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={pending}
      title="Corregir pago"
      description="Solo podés cambiar el importe y el método. El periodo no se modifica."
    >
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <Field label="Concepto">
            <Input readOnly value={paymentConcept(payment)} className="bg-muted/40" />
          </Field>
          <MoneyField label="Importe cobrado (€)" name="amountEuros" required disabled={pending} defaultCents={payment.amountCents} />
          <FormSelect
            label="Método de pago"
            name="method"
            required
            disabled={pending}
            defaultValue={payment.method ?? ""}
            options={PAYMENT_METHODS.map((item) => ({ value: item.value, label: item.label }))}
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <PendingButton type="submit" className="min-h-11" disabled={pending} pending={pending} pendingLabel="Guardando…">
              Guardar
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
    </FormDialog>
  );
}

function PaymentRowActions({ payment }: { payment: MemberPaymentRow }) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function remove() {
    if (!begin()) return;
    try {
      await api(`/api/v1/admin/payments/${payment.id}`, { method: "DELETE" });
      toast.success("Pago eliminado");
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="inline-flex items-center justify-end gap-1.5">
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 px-2.5" disabled={pending} onClick={() => setEditOpen(true)}>
          Editar
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 px-2.5 text-destructive pointer-hover:text-destructive" disabled={pending} onClick={() => setDeleteOpen(true)}>
          Eliminar
        </Button>
      </div>
      <PaymentEditDialog payment={payment} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar pago"
        description={`¿Eliminar el pago de ${formatPrice(payment.amountCents)} (${paymentConcept(payment)})? El socio volverá a aparecer como impago si era el único pago de ese periodo.`}
        confirmLabel="Eliminar pago"
        confirmVariant="destructive"
        busy={pending}
        busyLabel="Eliminando…"
        onConfirm={() => void remove()}
      />
    </>
  );
}

export function MemberPaymentsTable({ payments }: { payments: MemberPaymentRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
      <Table className="min-w-[24rem]">
        <TableHeader>
          <TableRow className="pointer-hover:bg-transparent">
            <TableHead className="h-10 px-3">Registrado el</TableHead>
            <TableHead className="h-10 px-3">Periodo / concepto</TableHead>
            <TableHead className="h-10 px-3 text-right">Importe</TableHead>
            <TableHead className="hidden h-10 px-3 sm:table-cell">Método</TableHead>
            <TableHead className="hidden h-10 px-3 md:table-cell">Registrado por</TableHead>
            <TableHead className="h-10 w-0 px-3 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} className="border-border">
              <TableCell className="px-3 py-2.5 align-middle text-sm tabular-nums whitespace-nowrap">
                <time dateTime={payment.createdAt}>{formatRecordedAt(payment.createdAt)}</time>
              </TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-sm">{paymentConcept(payment)}</TableCell>
              <TableCell className="px-3 py-2.5 align-middle text-right text-sm tabular-nums font-medium">
                {formatPrice(payment.amountCents)}
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 align-middle text-sm text-muted-foreground sm:table-cell">
                {paymentMethodLabel(payment.method)}
              </TableCell>
              <TableCell className="hidden px-3 py-2.5 align-middle text-sm text-muted-foreground md:table-cell">
                {payment.recordedByName}
              </TableCell>
              <TableCell className="w-0 whitespace-nowrap px-3 py-2.5 align-middle text-right">
                <PaymentRowActions payment={payment} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
