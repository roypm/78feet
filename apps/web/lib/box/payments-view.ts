import type { PaymentBilling } from "@78feet/domain";
import {
  billingPeriodKindLabel,
  subscriptionPeriodLabel,
} from "@78feet/domain";

export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "bizum", label: "Bizum" },
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "TPV / tarjeta" },
  { value: "other", label: "Otro" },
] as const;

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method?.trim()) return "—";
  return PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method;
}

export type PaymentConceptSource = {
  billingPeriod: PaymentBilling;
  periodStart: string | null;
};

export function paymentConceptLabel(payment: PaymentConceptSource): string {
  if (payment.billingPeriod === "one_time") {
    return "Pago único";
  }
  if (payment.periodStart) {
    return `${billingPeriodKindLabel(payment.billingPeriod)} · ${subscriptionPeriodLabel(
      payment.billingPeriod as Exclude<PaymentBilling, "one_time">,
      payment.periodStart,
    )}`;
  }
  return billingPeriodKindLabel(payment.billingPeriod);
}

export type MemberPaymentRow = {
  id: string;
  billingPeriod: PaymentBilling;
  periodStart: string | null;
  amountCents: number;
  method: string | null;
  createdAt: string;
  recordedByName: string;
};

export type RegisteredPaymentRow = MemberPaymentRow & {
  memberId: string;
  memberName: string;
  paymentBoxName: string;
};
