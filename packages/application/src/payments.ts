import { eq } from 'drizzle-orm';
import { DomainError, createPaymentSchema, patchPaymentSchema, periodStartForDate, type CreatePayment, type PatchPayment } from '@78feet/domain';
import type { Database } from '@78feet/db/connection';
import { user, payment } from '@78feet/db/schema';
import { lockRows } from './bookings.ts';

export async function recordPayment(db: Database, input: CreatePayment, actorId: string, now = new Date()) {
  const values = createPaymentSchema.parse(input);
  return db.transaction(async tx => {
    await lockRows(tx, [], [values.userId]);
    const [member] = await tx.select().from(user).where(eq(user.id,values.userId));
    if (!member || member.role !== 'member' || !member.paymentBoxId) throw new DomainError('FORBIDDEN');
    const billingPeriod = values.billingPeriod;
    const periodStart = billingPeriod === 'one_time' ? null : periodStartForDate(values.periodStart!, billingPeriod);
    const [created] = await tx.insert(payment).values({ userId: member.id, paymentBoxId: member.paymentBoxId, billingPeriod, periodStart, amountCents: values.amountCents, method: values.method, recordedBy: actorId, createdAt: now }).returning();
    return created;
  });
}
export async function patchPayment(db: Database, id: string, input: PatchPayment) {
  const [updated] = await db.update(payment).set(patchPaymentSchema.parse(input)).where(eq(payment.id,id)).returning();
  if (!updated) throw new DomainError('FORBIDDEN');
  return updated;
}
export async function deletePayment(db: Database, id: string) {
  const deleted = await db.delete(payment).where(eq(payment.id,id)).returning({ id: payment.id });
  if (!deleted.length) throw new DomainError('FORBIDDEN');
  return { ok: true };
}
