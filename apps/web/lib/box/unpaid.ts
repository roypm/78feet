import {
  isSubscriptionBilling,
  localDateString,
  periodStartForDate,
  subscriptionPeriodLabel,
  type CreatePayment,
  type SubscriptionBilling,
  type TariffBilling,
} from "@78feet/domain";
import { prisma } from "../db";
import { isUniqueViolation } from "./db";
import { BoxError } from "./errors";
import { isoDateFromDb, isoDateToDb } from "./time";

export async function listUnpaid(onDate?: string) {
  const today = onDate ?? localDateString(new Date());
  const members = await prisma.user.findMany({
    where: {
      role: "member",
      status: "active",
      memberships: {
        some: {
          endedAt: null,
          tariff: {
            billingPeriod: { in: ["monthly", "quarterly", "semiannual", "annual"] },
          },
        },
      },
    },
    include: {
      memberships: {
        where: { endedAt: null },
        include: { tariff: true },
        take: 1,
      },
      paymentsReceived: {
        select: { billingPeriod: true, periodStart: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = members.flatMap((user) => {
    const tariff = user.memberships[0]?.tariff;
    if (!tariff || !isSubscriptionBilling(tariff.billingPeriod)) return [];
    const periodStart = periodStartForDate(today, tariff.billingPeriod);
    const paid = user.paymentsReceived.some(
      (payment) =>
        payment.billingPeriod === tariff.billingPeriod &&
        payment.periodStart &&
        isoDateFromDb(payment.periodStart) === periodStart,
    );
    if (paid) return [];
    return [
      {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        dni: user.dni,
        phone: user.phone,
        tariffName: tariff.name,
        priceCents: tariff.priceCents,
        billingPeriod: tariff.billingPeriod as SubscriptionBilling,
        periodStart,
        periodLabel: subscriptionPeriodLabel(tariff.billingPeriod, periodStart),
      },
    ];
  });

  return { asOf: today, members: rows };
}

function normalizePeriodStart(billingPeriod: CreatePayment["billingPeriod"], periodStart?: string): string | null {
  if (billingPeriod === "one_time") return null;
  if (!periodStart) return null;
  return periodStartForDate(periodStart, billingPeriod);
}

export async function recordPayment(input: CreatePayment, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.role !== "member") {
    throw new BoxError(404, "FORBIDDEN", "El socio no existe");
  }
  const periodStart = normalizePeriodStart(input.billingPeriod, input.periodStart);
  if (input.billingPeriod !== "one_time" && !periodStart) {
    throw new BoxError(400, "FORBIDDEN", "Falta el inicio del periodo");
  }
  if (input.billingPeriod === "one_time" && periodStart) {
    throw new BoxError(400, "FORBIDDEN", "Un pago único no lleva periodo");
  }
  try {
    const payment = await prisma.payment.create({
      data: {
        userId: input.userId,
        billingPeriod: input.billingPeriod,
        periodStart: periodStart ? isoDateToDb(periodStart) : null,
        amountCents: input.amountCents,
        method: input.method ?? null,
        recordedBy: actorId,
      },
    });
    return {
      id: payment.id,
      userId: payment.userId,
      billingPeriod: payment.billingPeriod,
      periodStart: payment.periodStart ? isoDateFromDb(payment.periodStart) : null,
      amountCents: payment.amountCents,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BoxError(409, "FORBIDDEN", "Ese periodo ya está marcado como pagado");
    }
    throw error;
  }
}

export function suggestPaymentForTariff(
  tariff: { billingPeriod: TariffBilling; priceCents: number },
  onDate = localDateString(new Date()),
) {
  if (!isSubscriptionBilling(tariff.billingPeriod)) {
    return null;
  }
  const periodStart = periodStartForDate(onDate, tariff.billingPeriod);
  return {
    billingPeriod: tariff.billingPeriod,
    periodStart,
    periodLabel: subscriptionPeriodLabel(tariff.billingPeriod, periodStart),
    amountCents: tariff.priceCents,
  };
}
