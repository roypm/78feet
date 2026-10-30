import { paginate, type PageWindow } from "./pagination";
import type { Prisma } from "@prisma/client";
import {
  localDateString,
  packBalance,
  usesPeriodicQuota,
  weekStartDate,
  weeklyQuotaAdjustmentTotal,
  weeklyUsed,
  type CreateMember,
  type GrantCredits,
  type PatchMember,
  type TariffConsumption,
  type WeeklyQuotaAdjustment,
} from "@78feet/domain";
import { hashPassword } from "../auth/password";
import { prisma } from "../db";
import type { Db } from "./db";
import { isUniqueViolation } from "./db";
import { BoxError } from "./errors";
import { isoDateFromDb, isoDateToDb } from "./time";
import { getMemberSummary } from "./summary";
import { createWeeklyQuotaAdjustment, listWeeklyQuotaAdjustments } from "./weekly-quota-adjustments";

type MemberUser = {
  id: string;
  loginId: string;
  dni: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive";
};

type MembershipView = {
  id: string;
  tariffId: string;
  tariffName: string;
  consumptionModel: TariffConsumption;
  billingPeriod: import("@78feet/domain").TariffBilling;
  priceCents: number;
  startedAt: string;
  endedAt: string | null;
};

function userView(user: MemberUser) {
  return {
    id: user.id,
    loginId: user.loginId,
    dni: user.dni,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    status: user.status,
  };
}

const membershipInclude = {
  tariff: {
    select: {
      name: true,
      consumptionModel: true,
      billingPeriod: true,
      priceCents: true,
    },
  },
} satisfies Prisma.MembershipInclude;

function membershipView(
  membership: Prisma.MembershipGetPayload<{ include: typeof membershipInclude }> | null,
): MembershipView | null {
  if (!membership) return null;
  return {
    id: membership.id,
    tariffId: membership.tariffId,
    tariffName: membership.tariff.name,
    consumptionModel: membership.tariff.consumptionModel,
    billingPeriod: membership.tariff.billingPeriod,
    priceCents: membership.tariff.priceCents,
    startedAt: membership.startedAt.toISOString(),
    endedAt: membership.endedAt?.toISOString() ?? null,
  };
}

async function requireAssignableTariff(tariffId: string) {
  const tariff = await prisma.tariff.findUnique({ where: { id: tariffId } });
  if (!tariff) throw new BoxError(404, "FORBIDDEN", "La tarifa no existe");
  if (!tariff.active) throw new BoxError(403, "FORBIDDEN", "La tarifa no está activa");
  return tariff;
}

async function requireMember(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "member") {
    throw new BoxError(404, "FORBIDDEN", "El socio no existe");
  }
  return user;
}

async function cancelFutureBookings(
  db: Db,
  userId: string,
  cancelledBy: string,
  now: Date,
): Promise<number> {
  const bookings = await db.booking.findMany({
    where: { userId, status: "active", instance: { startAt: { gt: now } } },
    select: { id: true },
  });
  if (bookings.length === 0) return 0;
  await db.booking.updateMany({
    where: { id: { in: bookings.map((booking) => booking.id) } },
    data: {
      status: "cancelled",
      quotaReturned: true,
      cancelledAt: now,
      cancelledBy,
    },
  });
  return bookings.length;
}

export async function listMembersPage(status: "active" | "inactive" | "all", page = 1) {
  const total = await prisma.user.count({ where: { role: "member", ...(status === "all" ? {} : { status }) } });
  return paginate(total, page, (window) => listMembers(status, window));
}

export async function listMembers(status: "active" | "inactive" | "all", window?: PageWindow) {
  const users = await prisma.user.findMany({
    ...window,
    where: {
      role: "member",
      ...(status === "all" ? {} : { status }),
    },
    select: {
      id: true,
      loginId: true,
      dni: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      status: true,
      memberships: {
        where: { endedAt: null },
        include: membershipInclude,
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
  });
  const ids = users.map((user) => user.id);
  const [grants, spent] = ids.length ? await Promise.all([
    prisma.creditGrant.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _sum: { quantity: true } }),
    prisma.booking.groupBy({ by: ["userId"], where: {
      userId: { in: ids }, pool: "pack", OR: [{ status: "active" }, { quotaReturned: false }],
    }, _count: { _all: true } }),
  ]) : [[], []];
  const granted = new Map(grants.map((row) => [row.userId, row._sum.quantity ?? 0]));
  const consumed = new Map(spent.map((row) => [row.userId, row._count._all]));
  return users.map((user) => ({
    ...userView(user),
    membership: membershipView(user.memberships[0] ?? null),
    packBalance: (granted.get(user.id) ?? 0) - (consumed.get(user.id) ?? 0),
  }));
}

export async function createMember(input: CreateMember, startedAt = new Date()) {
  await requireAssignableTariff(input.tariffId);
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        loginId: input.dni,
        passwordHash,
        role: "member",
        status: "active",
        firstName: input.firstName,
        lastName: input.lastName,
        dni: input.dni,
        phone: input.phone ?? null,
        email: input.email ?? null,
        memberships: {
          create: {
            tariffId: input.tariffId,
            startedAt,
          },
        },
      },
      include: {
        memberships: { where: { endedAt: null }, include: membershipInclude },
      },
    });
    return {
      ...userView(user),
      membership: membershipView(user.memberships[0] ?? null),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BoxError(409, "FORBIDDEN", "Ese DNI ya tiene cuenta");
    }
    throw error;
  }
}

export async function getMember(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        include: membershipInclude,
        orderBy: { startedAt: "desc" },
      },
      creditGrantsReceived: { orderBy: { createdAt: "desc" } },
      bookingsAsMember: {
        include: { instance: { include: { classType: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
      },
      paymentsReceived: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!user || user.role !== "member") {
    throw new BoxError(404, "FORBIDDEN", "El socio no existe");
  }
  const current = user.memberships.find((membership) => membership.endedAt === null) ?? null;
  const balance = packBalance({
    userId: user.id,
    grants: user.creditGrantsReceived.map((grant) => ({
      userId: grant.userId,
      quantity: grant.quantity,
    })),
    bookings: user.bookingsAsMember.map((booking) => ({
      id: booking.id,
      instanceId: booking.instanceId,
      userId: booking.userId,
      pool: booking.pool,
      status: booking.status,
      quotaReturned: booking.quotaReturned,
      createdBy: booking.createdBy,
      cancelledAt: booking.cancelledAt,
      cancelledBy: booking.cancelledBy,
    })),
  });
  return {
    ...userView(user),
    membership: membershipView(current),
    membershipHistory: user.memberships.map((membership) => membershipView(membership)),
    credits: {
      balance,
      grants: user.creditGrantsReceived.map((grant) => ({
        id: grant.id,
        quantity: grant.quantity,
        note: grant.note,
        createdAt: grant.createdAt.toISOString(),
      })),
    },
    bookings: user.bookingsAsMember.map((booking) => ({
      id: booking.id,
      instanceId: booking.instanceId,
      status: booking.status,
      pool: booking.pool,
      quotaReturned: booking.quotaReturned,
      date: isoDateFromDb(booking.instance.date),
      name: booking.instance.classType.name,
      startAt: booking.instance.startAt.toISOString(),
    })),
    payments: user.paymentsReceived.map((payment) => ({
      id: payment.id,
      billingPeriod: payment.billingPeriod,
      periodStart: payment.periodStart ? isoDateFromDb(payment.periodStart) : null,
      amountCents: payment.amountCents,
      method: payment.method,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}

export async function updateMember(id: string, patch: PatchMember) {
  const existing = await requireMember(id);
  const dni = patch.dni ?? existing.dni ?? existing.loginId;
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        firstName: patch.firstName ?? existing.firstName,
        lastName: patch.lastName ?? existing.lastName,
        phone: patch.phone === undefined ? existing.phone : patch.phone,
        email: patch.email === undefined ? existing.email : patch.email,
        dni,
        loginId: dni,
      },
      include: {
        memberships: { where: { endedAt: null }, include: membershipInclude },
      },
    });
    return {
      ...userView(user),
      membership: membershipView(user.memberships[0] ?? null),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BoxError(409, "FORBIDDEN", "Ese DNI ya tiene cuenta");
    }
    throw error;
  }
}

export async function changeMemberTariff(id: string, tariffId: string, actorId: string) {
  const user = await requireMember(id);
  if (user.status !== "active") {
    throw new BoxError(403, "FORBIDDEN", "El socio está de baja");
  }
  await requireAssignableTariff(tariffId);
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const current = await tx.membership.findFirst({
      where: { userId: id, endedAt: null },
      include: membershipInclude,
    });
    if (!current) {
      const next = await tx.membership.create({
        data: { userId: id, tariffId, startedAt: now },
        include: membershipInclude,
      });
      return { membership: membershipView(next), cancelledBookingCount: 0 };
    }
    if (current.tariffId === tariffId) {
      return { membership: membershipView(current), cancelledBookingCount: 0 };
    }
    await tx.membership.update({
      where: { id: current.id },
      data: { endedAt: now, endedReason: "change" },
    });
    const next = await tx.membership.create({
      data: { userId: id, tariffId, startedAt: now },
      include: membershipInclude,
    });
    const cancelledBookingCount = await cancelFutureBookings(tx, id, actorId, now);
    return { membership: membershipView(next), cancelledBookingCount };
  });
}

export async function grantMemberCredits(id: string, input: GrantCredits, actorId: string) {
  await requireMember(id);
  if (input.quantity < 0) {
    const detail = await getMember(id);
    if (detail.credits.balance + input.quantity < 0) {
      throw new BoxError(403, "FORBIDDEN", "No hay saldo suficiente para quitar");
    }
  }
  const grant = await prisma.creditGrant.create({
    data: {
      userId: id,
      quantity: input.quantity,
      note: input.note ?? null,
      createdBy: actorId,
    },
  });
  const detail = await getMember(id);
  return {
    grant: {
      id: grant.id,
      quantity: grant.quantity,
      note: grant.note,
      createdAt: grant.createdAt.toISOString(),
    },
    balance: detail.credits.balance,
  };
}

export async function resetMemberPassword(id: string, password: string) {
  await requireMember(id);
  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  return { ok: true };
}

export async function deactivateMember(id: string, actorId: string) {
  const user = await requireMember(id);
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    if (user.status === "active") {
      await tx.user.update({
        where: { id },
        data: { status: "inactive", tokenVersion: { increment: 1 } },
      });
    }
    await tx.membership.updateMany({
      where: { userId: id, endedAt: null },
      data: { endedAt: now, endedReason: "cancelled" },
    });
    const cancelledBookingCount = await cancelFutureBookings(tx, id, actorId, now);
    return { id, status: "inactive" as const, cancelledBookingCount };
  });
}

export async function reactivateMember(id: string) {
  const user = await requireMember(id);
  if (user.status === "active") {
    return { id, status: "active" as const };
  }
  await prisma.user.update({
    where: { id },
    data: { status: "active", tokenVersion: { increment: 1 } },
  });
  return { id, status: "active" as const };
}

export async function adjustMemberWeeklyQuota(
  id: string,
  input: WeeklyQuotaAdjustment,
  actorId: string,
  now = new Date(),
) {
  await requireMember(id);
  const membership = await prisma.membership.findFirst({
    where: { userId: id, endedAt: null },
    include: { tariff: true },
  });
  if (!membership?.tariff || !usesPeriodicQuota(membership.tariff.consumptionModel)) {
    throw new BoxError(403, "FORBIDDEN", "Solo aplica con tarifa mensual");
  }
  const today = localDateString(now);
  const weekStart = weekStartDate(today);
  const weekStartDb = isoDateToDb(weekStart);
  const existing = await listWeeklyQuotaAdjustments(prisma, id, weekStartDb);
  const bookings = await prisma.booking.findMany({
    where: { userId: id, OR: [{ status: "active" }, { quotaReturned: false }] },
    include: { instance: { select: { id: true, date: true } } },
  });
  const instancesById = new Map(
    bookings.map((booking) => [booking.instanceId, { date: isoDateFromDb(booking.instance.date) }]),
  );
  const domainBookings = bookings.map((booking) => ({
    id: booking.id,
    instanceId: booking.instanceId,
    userId: booking.userId,
    pool: booking.pool,
    status: booking.status,
    quotaReturned: booking.quotaReturned,
    createdBy: booking.createdBy,
    cancelledAt: booking.cancelledAt,
    cancelledBy: booking.cancelledBy,
  }));
  const used = weeklyUsed({
    bookings: domainBookings,
    instancesById,
    userId: id,
    weekDate: today,
    kind: input.kind,
  });
  const limit = input.kind === "directed" ? membership.tariff.weeklyDirected : membership.tariff.weeklyOpen;
  const adjustment = weeklyQuotaAdjustmentTotal(existing, input.kind) + input.delta;
  const available = limit - used + adjustment;
  if (available < 0) {
    throw new BoxError(403, "FORBIDDEN", "Quedaría cupo negativo esta semana");
  }
  const row = await createWeeklyQuotaAdjustment(prisma, {
    userId: id,
    weekStart: weekStartDb,
    kind: input.kind,
    delta: input.delta,
    note: input.note ?? null,
    createdBy: actorId,
  });
  const summary = await getMemberSummary(id, now);
  return {
    adjustment: {
      id: row.id,
      kind: row.kind,
      delta: row.delta,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    },
    quota: summary.quota,
  };
}
