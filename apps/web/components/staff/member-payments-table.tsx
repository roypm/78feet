import type { MemberPaymentRow } from "@/lib/box/payments";
import { paymentMethodLabel } from "@/lib/box/payments";
import {
  billingPeriodKindLabel,
  subscriptionPeriodLabel,
  type PaymentBilling,
} from "@78feet/domain";
import { formatPrice, formatRecordedAt } from "@/lib/box/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function paymentConcept(payment: MemberPaymentRow): string {
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

export function MemberPaymentsTable({ payments }: { payments: MemberPaymentRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
      <Table className="min-w-[20rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 px-3">Fecha</TableHead>
            <TableHead className="h-10 px-3">Concepto</TableHead>
            <TableHead className="h-10 px-3 text-right">Importe</TableHead>
            <TableHead className="hidden h-10 px-3 sm:table-cell">Método</TableHead>
            <TableHead className="hidden h-10 px-3 md:table-cell">Registrado por</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
