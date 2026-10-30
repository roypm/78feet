import type { Prisma } from "@prisma/client";
import {
  localDateString,
  packBalance,
  weekStartDate,
  weeklyQuotaAdjustmentTotal,
  weeklyUsed,
  type CreateMember,
  type GrantCredits,
  type PatchMember,
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
  tariffKind: "monthly" | "pack";
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
  tariff: true,
} satisfies Prisma.MembershipInclude;

function membershipView(
  membership: Prisma.MembershipGetPayload<{ include: typeof membershipInclude }> | null,
): MembershipView | null {
  if (!membership) return null;
  return {
    id: membership.id,
    tariffId: membership.tariffId,
    tariffName: membership.tariff.name,
    tariffKind: membership.tariff.kind,
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

export async function listMembers(status: "active" | "inactive" | "all") {
  const users = await prisma.user.findMany({
    where: {
      role: "member",
      ...(status === "all" ? {} : { status }),
    },
    include: {
      memberships: {
        where: { endedAt: null },
        include: membershipInclude,
        take: 1,
      },
      creditGrantsReceived: { select: { userId: true, quantity: true } },
      bookingsAsMember: {
        where: { pool: "pack" },
        select: { userId: true, pool: true, status: true, quotaReturned: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return users.map((user) => ({
    ...userView(user),
    membership: membershipView(user.memberships[0] ?? null),
    packBalance: packBalance({
      userId: user.id,
      grants: user.creditGrantsReceived,
      bookings: user.bookingsAsMember.map((booking) => ({
        id: "",
        instanceId: "",
        userId: booking.userId,
        pool: booking.pool,
        status: booking.status,
        quotaReturned: booking.quotaReturned,
        createdBy: "",
        cancelledAt: null,
        cancelledBy: null,
      })),
    }),
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
      kind: payment.kind,
      month: payment.month ? isoDateFromDb(payment.month) : null,
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
  if (!membership?.tariff || membership.tariff.kind !== "monthly") {
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
