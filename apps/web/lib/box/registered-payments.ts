import { prisma } from "../db";
import { isoDateFromDb } from "./time";
import { memberFullName } from "./format";
import { paginate } from "./pagination";
import type { RegisteredPaymentRow } from "./payments-view";

function mapRegisteredPaymentRow(
  payment: {
    id: string;
    billingPeriod: RegisteredPaymentRow["billingPeriod"];
    periodStart: Date | null;
    amountCents: number;
    method: string | null;
    createdAt: Date;
    user: { id: string; firstName: string; lastName: string };
    paymentBox: { name: string };
    recorder: { firstName: string; lastName: string };
  },
): RegisteredPaymentRow {
  return {
    id: payment.id,
    billingPeriod: payment.billingPeriod,
    periodStart: payment.periodStart ? isoDateFromDb(payment.periodStart) : null,
    amountCents: payment.amountCents,
    method: payment.method,
    createdAt: payment.createdAt.toISOString(),
    recordedByName: memberFullName(payment.recorder.firstName, payment.recorder.lastName),
    memberId: payment.user.id,
    memberName: memberFullName(payment.user.firstName, payment.user.lastName),
    paymentBoxName: payment.paymentBox.name,
  };
}

export async function listRegisteredPaymentsPage(paymentBoxId?: string, page = 1) {
  const where = paymentBoxId ? { paymentBoxId } : {};
  const [total, aggregates] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amountCents: true } }),
  ]);
  const result = await paginate(total, page, async (window) => {
    const rows = await prisma.payment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: window.skip,
      take: window.take,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        paymentBox: { select: { name: true } },
        recorder: { select: { firstName: true, lastName: true } },
      },
    });
    return rows.map(mapRegisteredPaymentRow);
  });
  return {
    ...result,
    totals: { count: total, amountCents: aggregates._sum.amountCents ?? 0 },
  };
}
