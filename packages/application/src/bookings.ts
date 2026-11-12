import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { assignPool, DomainError, evaluateMemberCancellation, quotaPeriodForConsumption, quotaPeriodStartDate, type BookingPool } from '@78feet/domain';
import type { Database, Transaction } from '@78feet/db/connection';
import { booking, classInstance, user, membership, tariff } from '@78feet/db/schema';
import { memberConsumption } from './consumption.ts';

// All writers must acquire classes in UUID order before members in UUID order.
export async function lockRows(tx: Transaction, instances: string[], members: string[]) {
  for (const id of [...new Set(instances)].sort()) await tx.execute(sql`SELECT id FROM class_instance WHERE id=${id}::uuid FOR UPDATE`);
  for (const id of [...new Set(members)].sort()) await tx.execute(sql`SELECT id FROM "user" WHERE id=${id}::uuid FOR UPDATE`);
}
export async function reserve(db: Database, instanceId: string, userId: string, actorId: string, now: Date) {
  return db.transaction(async tx => {
    await lockRows(tx,[instanceId],[userId]);
    const [instance] = await tx.select().from(classInstance).where(eq(classInstance.id,instanceId));
    const [member] = await tx.select({role:user.role,status:user.status}).from(user).where(eq(user.id,userId));
    if (!instance || instance.status!=='scheduled' || instance.startAt<=now || !member || member.role!=='member' || member.status!=='active') throw new DomainError('FORBIDDEN');
    const [current] = await tx.select({membership,tariff}).from(membership).innerJoin(tariff,eq(membership.tariffId,tariff.id)).where(and(eq(membership.userId,userId),sql`${membership.endedAt} IS NULL`));
    if (!current) throw new DomainError('NO_MEMBERSHIP');
    const overlaps = await tx.execute(sql`SELECT 1 FROM booking b JOIN class_instance i ON i.id=b.instance_id WHERE b.user_id=${userId}::uuid AND b.status='active' AND i.start_at<${instance.endAt} AND i.end_at>${instance.startAt} LIMIT 1`);
    if (overlaps.rowCount) throw new DomainError('OVERLAP');
    const occupancy = await tx.execute<{n:number}>(sql`SELECT count(*)::int n FROM booking WHERE instance_id=${instanceId}::uuid AND status='active'`);
    if (occupancy.rows[0].n>=instance.capacity) throw new DomainError('FULL');
    const period = quotaPeriodForConsumption(current.tariff.consumptionModel);
    const consumption = await memberConsumption(tx,userId,instance.date,period);
    const adjustments = period ? await tx.execute<{kind:string;delta:number}>(sql`SELECT kind,sum(delta)::int delta FROM quota_adjustment WHERE user_id=${userId}::uuid AND period=${period} AND period_start=${quotaPeriodStartDate(instance.date,period)}::date GROUP BY kind`) : {rows:[]};
    const pool: BookingPool = assignPool({consumptionModel:current.tariff.consumptionModel,classKind:instance.kind,quotaDirected:current.tariff.quotaDirected,quotaOpen:current.tariff.quotaOpen,...consumption,directedAdjustment:adjustments.rows.find(r=>r.kind==='directed')?.delta??0,openAdjustment:adjustments.rows.find(r=>r.kind==='open')?.delta??0});
    const [created] = await tx.insert(booking).values({id:randomUUID(),instanceId,userId,pool,status:'active',createdBy:actorId,createdAt:now}).returning();
    return created;
  });
}
export async function cancel(db: Database, bookingId: string, actorId: string, memberOnly: boolean, returnQuota: boolean, now: Date) {
  const [target] = await db.select({instanceId:booking.instanceId,userId:booking.userId}).from(booking).where(eq(booking.id,bookingId));
  if (!target || (memberOnly && target.userId!==actorId)) throw new DomainError('FORBIDDEN');
  return db.transaction(async tx => {
    await lockRows(tx,[target.instanceId],[target.userId]);
    const [existing] = await tx.select({booking,instance:classInstance}).from(booking).innerJoin(classInstance,eq(booking.instanceId,classInstance.id)).where(eq(booking.id,bookingId));
    if (!existing || existing.booking.status!=='active') throw new DomainError('FORBIDDEN');
    const quotaReturned = memberOnly ? evaluateMemberCancellation(now,existing.instance.startAt).quotaReturned : returnQuota;
    return (await tx.update(booking).set({status:'cancelled',cancelledAt:now,cancelledBy:actorId,quotaReturned}).where(eq(booking.id,bookingId)).returning())[0];
  });
}
