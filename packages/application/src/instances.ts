import { and, asc, eq, sql } from 'drizzle-orm';
import { DomainError, atBoxTime, assertValidTimeRange, createInstanceSchema, patchInstanceSchema, isOpenDuring, weekdayMonday1, type CreateInstance, type PatchInstance } from '@78feet/domain';
import type { Database, Transaction } from '@78feet/db/connection';
import { box, booking, classInstance, classTemplate, classType, training, user } from '@78feet/db/schema';
import { lockRows } from './bookings.ts';
import { getBoxHours, instanceClock, lockBox } from './schedule.ts';

async function lockScheduleInstance(tx: Transaction, id: string) {
  const [target] = await tx.select({ boxId: classInstance.boxId }).from(classInstance).where(eq(classInstance.id, id));
  if (!target) throw new DomainError('FORBIDDEN', 'La clase no existe');
  await lockBox(tx, target.boxId);
  await lockRows(tx, [id], []);
  const [existing] = await tx.select().from(classInstance).where(eq(classInstance.id, id));
  if (!existing) throw new DomainError('FORBIDDEN');
  return existing;
}
async function assertCoach(tx: Transaction, id: string | null | undefined) {
  if (!id) return;
  const [coach] = await tx.select({ role: user.role, status: user.status }).from(user).where(eq(user.id, id));
  if (!coach || coach.role === 'member' || coach.status !== 'active') throw new DomainError('FORBIDDEN', 'El coach no está activo');
}
async function assertNoOverlap(tx: Transaction, candidate: typeof classInstance.$inferInsert) {
  const others = await tx.execute(sql`SELECT id FROM class_instance WHERE box_id=${candidate.boxId}::uuid AND date=${candidate.date}::date AND kind=${candidate.kind} AND status='scheduled' AND start_at<${candidate.endAt} AND end_at>${candidate.startAt} AND id IS DISTINCT FROM ${candidate.id ?? null}::uuid LIMIT 1`);
  if (others.rowCount) throw new DomainError('OVERLAP');
}
async function cancelActives(tx: Transaction, id: string, actorId: string, now: Date) {
  const actives = await tx.select({ userId: booking.userId }).from(booking).where(and(eq(booking.instanceId, id), eq(booking.status, 'active')));
  await lockRows(tx, [], actives.map(b => b.userId));
  const changed = await tx.update(booking).set({ status: 'cancelled', cancelledAt: now, cancelledBy: actorId, quotaReturned: true }).where(and(eq(booking.instanceId, id), eq(booking.status, 'active'))).returning({ id: booking.id });
  return changed.length;
}
export async function createExtraInstance(db: Database, input: CreateInstance, now = new Date()) {
  const values = createInstanceSchema.parse(input);
  return db.transaction(async tx => {
    const boxId = values.boxId ?? (await tx.select({ id: box.id }).from(box).orderBy(asc(box.createdAt), asc(box.id)).limit(1))[0]?.id;
    if (!boxId) throw new DomainError('FORBIDDEN');
    await lockBox(tx, boxId);
    const [type] = await tx.select().from(classType).where(eq(classType.id, values.classTypeId));
    if (!type) throw new DomainError('FORBIDDEN');
    await assertCoach(tx, values.coachId);
    assertValidTimeRange(values.startTime, values.endTime);
    if (!isOpenDuring(await getBoxHours(tx, boxId), values.date, values.startTime, values.endTime)) throw new DomainError('SCHEDULE_CLOSED');
    const candidate = { boxId, date: values.date, classTypeId: type.id, kind: type.kind, coachId: values.coachId, capacity: values.capacity, startAt: atBoxTime(values.date, values.startTime), endAt: atBoxTime(values.date, values.endTime), status: 'scheduled' as const, editedAt: now };
    await assertNoOverlap(tx, candidate);
    return (await tx.insert(classInstance).values(candidate).returning())[0];
  });
}
export async function patchInstance(db: Database, id: string, input: PatchInstance, actorId: string, now = new Date()) {
  const patch = patchInstanceSchema.parse(input);
  return db.transaction(async tx => {
    const existing = await lockScheduleInstance(tx, id);
    const startTime = patch.startTime ?? instanceClock(existing.startAt);
    const endTime = patch.endTime ?? instanceClock(existing.endAt);
    assertValidTimeRange(startTime, endTime);
    const classTypeId = patch.classTypeId ?? existing.classTypeId;
    const [type] = await tx.select().from(classType).where(eq(classType.id, classTypeId));
    if (!type) throw new DomainError('FORBIDDEN');
    const status = patch.status ?? existing.status;
    const coachId = patch.coachId === undefined ? existing.coachId : patch.coachId;
    await assertCoach(tx, coachId);
    if (existing.status === 'cancelled' && status === 'scheduled' && existing.startAt <= now) throw new DomainError('FORBIDDEN');
    let trainingId = patch.trainingId === undefined ? existing.trainingId : patch.trainingId;
    if (trainingId) {
      const [plan] = await tx.select().from(training).where(eq(training.id, trainingId));
      if (!plan || plan.classTypeId !== classTypeId) {
        if (patch.trainingId !== undefined) throw new DomainError('FORBIDDEN', 'El entrenamiento debe ser del mismo tipo');
        trainingId = null;
      }
    }
    const candidate = { ...existing, classTypeId, kind: type.kind, coachId, trainingId, capacity: patch.capacity ?? existing.capacity, status, startAt: atBoxTime(existing.date, startTime), endAt: atBoxTime(existing.date, endTime) };
    if (status === 'scheduled') {
      if (!isOpenDuring(await getBoxHours(tx, existing.boxId), existing.date, startTime, endTime)) throw new DomainError('SCHEDULE_CLOSED');
      await assertNoOverlap(tx, candidate);
    }
    const activeCount = await tx.execute<{ n: number }>(sql`SELECT count(*)::int n FROM booking WHERE instance_id=${id}::uuid AND status='active'`);
    const capacityDrops = candidate.capacity < activeCount.rows[0].n;
    const typeChanged = classTypeId !== existing.classTypeId;
    if (capacityDrops && !patch.confirmCapacity && !typeChanged && status !== 'cancelled') throw new DomainError('CONFIRM_REQUIRED', undefined, { detachCount: activeCount.rows[0].n });
    const cancelledBookingCount = (status === 'cancelled' && existing.status !== 'cancelled') || typeChanged || (capacityDrops && status === 'scheduled') ? await cancelActives(tx, id, actorId, now) : 0;
    const edited = candidate.startAt.getTime() !== existing.startAt.getTime() || candidate.endAt.getTime() !== existing.endAt.getTime() || typeChanged || coachId !== existing.coachId || candidate.capacity !== existing.capacity || status !== existing.status || trainingId !== existing.trainingId;
    await tx.update(classInstance).set({ ...candidate, cancelReason: status === 'cancelled' ? patch.cancelReason ?? existing.cancelReason ?? 'Cancelada por el box' : null, editedAt: edited ? now : existing.editedAt }).where(eq(classInstance.id, id));
    return { id, cancelledBookingCount };
  });
}
export async function removeExtraInstance(db: Database, id: string, actorId: string, now = new Date()) {
  return db.transaction(async tx => {
    const existing = await lockScheduleInstance(tx, id);
    if (existing.templateId || existing.startAt <= now) throw new DomainError('FORBIDDEN');
    const [history] = await tx.select({ id: booking.id }).from(booking).where(eq(booking.instanceId, id)).limit(1);
    if (!history) { await tx.delete(classInstance).where(eq(classInstance.id, id)); return { deleted: true, cancelledBookingCount: 0 }; }
    const cancelledBookingCount = await cancelActives(tx, id, actorId, now);
    await tx.update(classInstance).set({ status: 'cancelled', cancelReason: 'Clase extra retirada', editedAt: now }).where(eq(classInstance.id, id));
    return { deleted: false, cancelledBookingCount };
  });
}
export async function restoreInstanceFromTemplate(db: Database, id: string, actorId: string, now = new Date()) {
  return db.transaction(async tx => {
    const existing = await lockScheduleInstance(tx, id);
    if (!existing.templateId || !existing.editedAt || existing.startAt <= now) throw new DomainError('FORBIDDEN');
    const [source] = await tx.select({ template: classTemplate, kind: classType.kind }).from(classTemplate).innerJoin(classType, eq(classTemplate.classTypeId, classType.id)).where(eq(classTemplate.id, existing.templateId));
    if (!source?.template.active || source.template.weekday !== weekdayMonday1(existing.date)) throw new DomainError('FORBIDDEN');
    const t = source.template;
    if (!isOpenDuring(await getBoxHours(tx, existing.boxId), existing.date, t.startTime, t.endTime)) throw new DomainError('SCHEDULE_CLOSED');
    const candidate = { ...existing, startAt: atBoxTime(existing.date, t.startTime), endAt: atBoxTime(existing.date, t.endTime), classTypeId: t.classTypeId, kind: source.kind, capacity: t.defaultCapacity, coachId: t.coachId, status: 'scheduled' as const, editedAt: null, cancelReason: null };
    await assertNoOverlap(tx, candidate);
    const count = await tx.execute<{ n: number }>(sql`SELECT count(*)::int n FROM booking WHERE instance_id=${id}::uuid AND status='active'`);
    const cancelledBookingCount = t.classTypeId !== existing.classTypeId || t.defaultCapacity < count.rows[0].n ? await cancelActives(tx, id, actorId, now) : 0;
    if (existing.trainingId) {
      const [plan] = await tx.select().from(training).where(eq(training.id, existing.trainingId));
      if (plan?.classTypeId !== t.classTypeId) candidate.trainingId = null;
    }
    await tx.update(classInstance).set(candidate).where(eq(classInstance.id, id));
    return { id, cancelledBookingCount };
  });
}
