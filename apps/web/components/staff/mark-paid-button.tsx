"use client";

import { PendingButton } from "@/components/feedback/pending-button";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import type { SubscriptionBilling } from "@78feet/domain";
import { api } from "@/lib/box/api";
import { formatPrice } from "@/lib/box/format";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, controlClass } from "@/components/staff/field";
import { FormDialog } from "@/components/staff/form-dialog";

const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "bizum", label: "Bizum" },
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "TPV / tarjeta" },
  { value: "other", label: "Otro" },
] as const;

function eurosInputDefault(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function parseEurosInput(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function MarkPaidButton({
  userId,
  billingPeriod,
  periodStart,
  periodLabel,
  amountCents,
}: {
  userId: string;
  billingPeriod: SubscriptionBilling;
  periodStart: string;
  periodLabel: string;
  amountCents: number;
}) {
  const { router, pending, begin, setPending } = useActionFeedback();
  const [open, setOpen] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseEurosInput(String(form.get("amountEuros") ?? ""));
    if (parsed === null) {
      toast.error("Importe no válido");
      return;
    }
    const method = String(form.get("method") ?? "").trim();
    if (!method) {
      toast.error("Elegí un método de pago");
      return;
    }

    if (!begin()) return;
    try {
      await api("/api/v1/admin/payments", {
        method: "POST",
        body: JSON.stringify({
          userId,
          billingPeriod,
          periodStart,
          amountCents: parsed,
          method,
        }),
      });
      toast.success("Pago registrado");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar");
    } finally {
      setPending(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      busy={pending}
      trigger={
        <Button type="button" variant="outline" className="min-h-11">
          Marcar como pagado
        </Button>
      }
      title="Registrar pago"
      description={`${periodLabel}. Tarifa ${formatPrice(amountCents)}.`}
    >
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <fieldset disabled={pending} aria-busy={pending} className="contents">
          <input type="hidden" name="periodStart" value={periodStart} />
          <Field label="Periodo">
            <Input readOnly value={periodLabel} className="bg-muted/40" />
          </Field>
          <Field label="Importe cobrado (€)">
            <Input
              name="amountEuros"
              inputMode="decimal"
              required
              defaultValue={eurosInputDefault(amountCents)}
              className="tabular-nums"
              autoComplete="off"
            />
          </Field>
          <Field label="Método de pago">
            <select name="method" required className={controlClass} defaultValue="cash">
              {PAYMENT_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <PendingButton type="submit" className="min-h-11" disabled={pending} pending={pending} pendingLabel={"Guardando…"}>
              {"Registrar pago"}
            </PendingButton>
          </DialogFooter>
        </fieldset>
      </form>
    </FormDialog>
  );
}
