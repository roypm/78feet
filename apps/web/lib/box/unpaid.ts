import { localDateString, type CreatePayment } from "@78feet/domain";
import { prisma } from "../db";
import { isUniqueViolation } from "./db";
import { BoxError } from "./errors";
import { isoDateFromDb, isoDateToDb } from "./time";

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export async function listUnpaid(month?: string) {
  const today = month ? monthStart(month) : monthStart(localDateString(new Date()));
  const monthDate = isoDateToDb(today);
  const members = await prisma.user.findMany({
    where: {
      role: "member",
      status: "active",
      memberships: {
        some: {
          endedAt: null,
          tariff: { kind: "monthly" },
        },
      },
      paymentsReceived: { none: { kind: "monthly", month: monthDate } },
    },
    include: {
      memberships: {
        where: { endedAt: null },
        include: { tariff: true },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return {
    month: today,
    members: members.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      dni: user.dni,
      phone: user.phone,
      tariffName: user.memberships[0]?.tariff.name ?? "",
      priceCents: user.memberships[0]?.tariff.priceCents ?? 0,
    })),
  };
}

export async function recordPayment(input: CreatePayment, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.role !== "member") {
    throw new BoxError(404, "FORBIDDEN", "El socio no existe");
  }
  if (input.kind === "monthly" && !input.month) {
    throw new BoxError(400, "FORBIDDEN", "El pago mensual necesita el mes");
  }
  if (input.kind === "pack" && input.month) {
    throw new BoxError(400, "FORBIDDEN", "Un bono no lleva mes");
  }
  try {
    const payment = await prisma.payment.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        month: input.kind === "monthly" && input.month ? isoDateToDb(monthStart(input.month)) : null,
        amountCents: input.amountCents,
        method: input.method ?? null,
        recordedBy: actorId,
      },
    });
    return {
      id: payment.id,
      userId: payment.userId,
      kind: payment.kind,
      month: payment.month ? isoDateFromDb(payment.month) : null,
      amountCents: payment.amountCents,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BoxError(409, "FORBIDDEN", "Ese mes ya está marcado como pagado");
    }
    throw error;
  }
}
