import { NavigationLink as Link } from "@/components/feedback/navigation-link";
import type { RegisteredPaymentRow } from "@/lib/box/payments-view";
import { paymentConceptLabel, paymentMethodLabel } from "@/lib/box/payments-view";
import { formatPrice, formatRecordedAt } from "@/lib/box/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RegisteredPaymentsTable({
  payments,
  showPaymentBox,
}: {
  payments: RegisteredPaymentRow[];
  showPaymentBox: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
      <Table className="min-w-[28rem]">
        <TableHeader>
          <TableRow className="pointer-hover:bg-transparent">
            <TableHead className="h-10 px-3">Registrado el</TableHead>
            <TableHead className="h-10 min-w-[9rem] px-3">Socio</TableHead>
            {showPaymentBox ? <TableHead className="hidden h-10 px-3 sm:table-cell">Box de pago</TableHead> : null}
            <TableHead className="h-10 px-3">Periodo / concepto</TableHead>
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
              <TableCell className="min-w-[9rem] px-3 py-2.5 align-middle text-sm">
                <Link href={`/staff/socios/${payment.memberId}/pagos`} className="font-medium text-primary">
                  {payment.memberName}
                </Link>
              </TableCell>
              {showPaymentBox ? (
                <TableCell className="hidden px-3 py-2.5 align-middle text-sm text-muted-foreground sm:table-cell">
                  {payment.paymentBoxName}
                </TableCell>
              ) : null}
              <TableCell className="px-3 py-2.5 align-middle text-sm">{paymentConceptLabel(payment)}</TableCell>
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
