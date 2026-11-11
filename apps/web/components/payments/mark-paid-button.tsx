"use client";

import { FormActions } from "@/components/common/forms/form-actions";
import { PaymentFields } from "./payment-fields";

import { useState, type FormEvent } from "react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { toast } from "sonner";
import type { SubscriptionBilling } from "@78feet/domain";
import { api } from "@/lib/box/api";
import { formatPrice } from "@/lib/box/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseEuroCents } from "@/lib/ui/numbers";
import { Field } from "@/components/common/forms/field";
import { FormDialog } from "@/components/common/dialogs/form-dialog";

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
    const parsed = parseEuroCents(String(form.get("amountEuros") ?? ""));
    if (parsed === null) return;
    const method = String(form.get("method") ?? "").trim();
    if (!method) return;

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
          <PaymentFields disabled={pending} />
          <FormActions
            pending={pending}
            onCancel={() => setOpen(false)}
            submitLabel={"Registrar pago"}
            pendingLabel={"Guardando…"}
          />
        </fieldset>
      </form>
    </FormDialog>
  );
}
