import { and, eq, isNull, sql } from 'drizzle-orm';
import { DomainError, grantCreditsSchema, quotaAdjustmentSchema, localDateString, quotaPeriodForConsumption, quotaPeriodStartDate, type GrantCredits, type QuotaAdjustment } from '@78feet/domain';
import type { Database, Transaction } from '@78feet/db/connection';
import { user, membership, tariff, creditGrant, quotaAdjustment } from '@78feet/db/schema';
import { memberAuthSession } from '@78feet/db/auth-schema';
import { lockRows } from './bookings.ts';
import { memberConsumption } from './consumption.ts';

async function lockedMember(tx: Transaction, id: string) {
  await lockRows(tx, [], [id]);
  const [member] = await tx.select().from(user).where(eq(user.id, id));
  if (!member || member.role !== 'member') throw new DomainError('FORBIDDEN');
  return member;
}

// Caller holds the member row. This changes bookings, never class rows; it must
// not acquire class locks after the member lock (reserve uses class → member).
async function cancelFutureBookings(tx: Transaction, id: string, actorId: string, now: Date) {
  const result = await tx.execute(sql`
    UPDATE booking b SET status='cancelled', quota_returned=true,
      cancelled_at=${now}, cancelled_by=${actorId}::uuid
    FROM class_instance i WHERE i.id=b.instance_id AND b.user_id=${id}::uuid
      AND b.status='active' AND i.start_at>${now}`);
  return result.rowCount ?? 0;
}

export async function changeMemberTariff(db: Database, id: string, tariffId: string, actorId: string, now = new Date()) {
  return db.transaction(async tx => {
    const member = await lockedMember(tx, id);
    if (member.status !== 'active') throw new DomainError('FORBIDDEN');
    // Keep tariff assignment and administrative deactivation mutually exclusive.
    const [nextTariff] = await tx.select().from(tariff).where(eq(tariff.id, tariffId)).for('share');
    if (!nextTariff?.active) throw new DomainError('FORBIDDEN');
    const [current] = await tx.select().from(membership).where(and(eq(membership.userId, id), isNull(membership.endedAt)));
    if (current?.tariffId === tariffId) return { membership: current, cancelledBookingCount: 0 };
    if (current) await tx.update(membership).set({ endedAt: now, endedReason: 'change' }).where(eq(membership.id, current.id));
    const [next] = await tx.insert(membership).values({ userId: id, tariffId, startedAt: now }).returning();
    const cancelledBookingCount = current ? await cancelFutureBookings(tx, id, actorId, now) : 0;
    return { membership: next, cancelledBookingCount };
  });
}

export async function grantMemberCredits(db: Database, id: string, input: GrantCredits, actorId: string, now = new Date()) {
  const values = grantCreditsSchema.parse(input);
  return db.transaction(async tx => {
    await lockedMember(tx, id);
    const { packBalance } = await memberConsumption(tx, id, localDateString(now), null);
    if (values.quantity < 0 && packBalance + values.quantity < 0) throw new DomainError('FORBIDDEN', 'No hay saldo suficiente para quitar');
    const [grant] = await tx.insert(creditGrant).values({ userId: id, ...values, createdBy: actorId, createdAt: now }).returning();
    return { grant, balance: packBalance + values.quantity };
  });
}

export async function adjustMemberQuota(db: Database, id: string, input: QuotaAdjustment, actorId: string, now = new Date()) {
  const values = quotaAdjustmentSchema.parse(input);
  return db.transaction(async tx => {
    await lockedMember(tx, id);
    const [current] = await tx.select({ tariff }).from(membership).innerJoin(tariff, eq(membership.tariffId, tariff.id)).where(and(eq(membership.userId, id), isNull(membership.endedAt)));
    const period = current && quotaPeriodForConsumption(current.tariff.consumptionModel);
    if (!current || !period) throw new DomainError('FORBIDDEN', 'Solo aplica con tarifas de cupo periódico');
    const limit = values.kind === 'directed' ? current.tariff.quotaDirected : current.tariff.quotaOpen;
    if (limit === null) throw new DomainError('FORBIDDEN', 'Un cupo ilimitado no se ajusta');
    const today = localDateString(now);
    const periodStart = quotaPeriodStartDate(today, period);
    const consumption = await memberConsumption(tx, id, today, period);
    const used = values.kind === 'directed' ? consumption.usedDirected : consumption.usedOpen;
    const existing = await tx.execute<{ total: number }>(sql`SELECT coalesce(sum(delta),0)::int total FROM quota_adjustment WHERE user_id=${id}::uuid AND period=${period} AND period_start=${periodStart}::date AND kind=${values.kind}`);
    const available = limit - used + existing.rows[0].total + values.delta;
    if (available < 0) throw new DomainError('FORBIDDEN', 'El ajuste dejaría el cupo por debajo de las reservas consumidas');
    const [adjustment] = await tx.insert(quotaAdjustment).values({ userId: id, ...values, period, periodStart, createdBy: actorId, createdAt: now }).returning();
    return { adjustment, available };
  });
}

export async function deactivateMember(db: Database, id: string, actorId: string, now = new Date()) {
  return db.transaction(async tx => {
    const member = await lockedMember(tx, id);
    await tx.update(user).set({ status: 'inactive', updatedAt: now }).where(eq(user.id, id));
    await tx.delete(memberAuthSession).where(eq(memberAuthSession.userId, member.authUserId));
    await tx.update(membership).set({ endedAt: now, endedReason: 'cancelled' }).where(and(eq(membership.userId, id), isNull(membership.endedAt)));
    return { id, status: 'inactive' as const, cancelledBookingCount: await cancelFutureBookings(tx, id, actorId, now) };
  });
}

export async function reactivateMember(db: Database, id: string, now = new Date()) {
  return db.transaction(async tx => {
    const member = await lockedMember(tx, id);
    // Reactivation never resurrects memberships, bookings or old sessions.
    await tx.delete(memberAuthSession).where(eq(memberAuthSession.userId, member.authUserId));
    await tx.update(user).set({ status: 'active', updatedAt: now }).where(eq(user.id, id));
    return { id, status: 'active' as const };
  });
}
