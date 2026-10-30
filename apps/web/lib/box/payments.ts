import { prisma } from "../db";
import { BoxError } from "./errors";
import { isoDateFromDb } from "./time";
import { memberFullName } from "./format";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  bizum: "Bizum",
  transfer: "Transferencia",
  card: "TPV / tarjeta",
  other: "Otro",
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method?.trim()) return "—";
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export type MemberPaymentRow = {
  id: string;
  kind: "monthly" | "pack";
  month: string | null;
  amountCents: number;
  method: string | null;
  createdAt: string;
  recordedByName: string;
};

export async function listMemberPayments(memberId: string) {
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

  const rows = await prisma.payment.findMany({
    where: { userId: memberId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      recorder: { select: { firstName: true, lastName: true } },
    },
  });

  return {
    member: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      dni: user.dni,
      loginId: user.loginId,
    },
    payments: rows.map((payment) => ({
      id: payment.id,
      kind: payment.kind,
      month: payment.month ? isoDateFromDb(payment.month) : null,
      amountCents: payment.amountCents,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
      recordedByName: memberFullName(payment.recorder.firstName, payment.recorder.lastName),
    })) satisfies MemberPaymentRow[],
  };
}
