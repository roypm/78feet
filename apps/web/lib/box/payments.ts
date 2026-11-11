import type { PatchPayment } from "@78feet/domain";
import { paginate } from "./pagination";
import { prisma } from "../db";
import { BoxError } from "./errors";
import { isoDateFromDb } from "./time";
import { memberFullName } from "./format";
import type { MemberPaymentRow } from "./payments-view";

export type { MemberPaymentRow, RegisteredPaymentRow } from "./payments-view";
export { paymentMethodLabel, paymentConceptLabel } from "./payments-view";
export { listRegisteredPaymentsPage } from "./registered-payments";

export async function listMemberPayments(memberId: string, page = 1) {
  const user = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      dni: true,
      loginId: true,
    },
  });
  if (!user || user.role !== "member") {
    throw new BoxError(404, "FORBIDDEN", "El socio no existe");
  }

  const total = await prisma.payment.count({ where: { userId: memberId } });
  const result = await paginate(total, page, (window) =>
    prisma.payment.findMany({
      where: { userId: memberId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...window,
      include: { recorder: { select: { firstName: true, lastName: true } } },
    }),
  );

  return {
    member: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      dni: user.dni,
      loginId: user.loginId,
    },
    pageInfo: result.pageInfo,
    payments: result.items.map((payment) => ({
      id: payment.id,
      billingPeriod: payment.billingPeriod,
      periodStart: payment.periodStart ? isoDateFromDb(payment.periodStart) : null,
      amountCents: payment.amountCents,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
      recordedByName: memberFullName(payment.recorder.firstName, payment.recorder.lastName),
    })) satisfies MemberPaymentRow[],
  };
}

function paymentView(
  payment: {
    id: string;
    billingPeriod: MemberPaymentRow["billingPeriod"];
    periodStart: Date | null;
    amountCents: number;
    method: string | null;
    createdAt: Date;
  },
  recordedByName: string,
): MemberPaymentRow {
  return {
    id: payment.id,
    billingPeriod: payment.billingPeriod,
    periodStart: payment.periodStart ? isoDateFromDb(payment.periodStart) : null,
    amountCents: payment.amountCents,
    method: payment.method,
    createdAt: payment.createdAt.toISOString(),
    recordedByName,
  };
}

export async function patchPayment(paymentId: string, input: PatchPayment) {
  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { recorder: { select: { firstName: true, lastName: true } } },
  });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "El pago no existe");

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      ...(input.amountCents !== undefined ? { amountCents: input.amountCents } : {}),
      ...(input.method !== undefined ? { method: input.method } : {}),
    },
    include: { recorder: { select: { firstName: true, lastName: true } } },
  });

  return paymentView(payment, memberFullName(payment.recorder.firstName, payment.recorder.lastName));
}

export async function deletePayment(paymentId: string) {
  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true },
  });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "El pago no existe");
  await prisma.payment.delete({ where: { id: paymentId } });
}
