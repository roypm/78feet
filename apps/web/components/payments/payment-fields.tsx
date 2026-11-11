"use client";

import { MoneyField } from "@/components/common/forms/numeric-field";
import { FormSelect } from "@/components/common/forms/form-select";
import { PAYMENT_METHODS } from "@/lib/box/payments-view";

export function PaymentFields({
  disabled,
  amountCents,
  method,
}: {
  disabled: boolean;
  amountCents?: number;
  method?: string | null;
}) {
  return (
    <>
      <MoneyField
        label="Importe cobrado (€)"
        name="amountEuros"
        required
        disabled={disabled}
        defaultCents={amountCents}
      />
      <FormSelect
        label="Método de pago"
        name="method"
        required
        disabled={disabled}
        defaultValue={method ?? ""}
        options={
          method === undefined ? [{ value: "", label: "Elegí un método…" }, ...PAYMENT_METHODS] : [...PAYMENT_METHODS]
        }
      />
    </>
  );
}
