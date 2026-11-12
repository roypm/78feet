import { and, asc, eq, gte, inArray } from 'drizzle-orm';
import { DomainError, applyTemplateDraftSchema, templateWriteSchema, patchTemplateSchema, assertValidTimeRange, isWithinOpeningIntervals, localDateString, nextMondayDate, horizonRange, templateConflicts, propagateTemplateChange, type ApplyTemplateDraft, type TemplateWrite, type PatchTemplate, type ClassTemplate, type TemplateChange, type PropagationSummary } from '@78feet/domain';
import type { Database, Transaction } from '@78feet/db/connection';
import { box, classTemplate, classType, classInstance, booking, training, user } from '@78feet/db/schema';
import { lockBox, getBoxHours, ensureBoxInstances } from './schedule.ts';
import { lockRows } from './bookings.ts';

async function propagate(tx: Transaction, boxId: string, templateId: string, change: TemplateChange, actorId: string, today: string, now: Date) {
  const from = nextMondayDate(today);
  const rows = await tx.select({ instance: classInstance, trainingClassTypeId: training.classTypeId }).from(classInstance).leftJoin(training, eq(classInstance.trainingId, training.id)).where(and(eq(classInstance.boxId, boxId), gte(classInstance.date, from)));
  const ids = rows.map(r => r.instance.id);
  const bookings = ids.length ? await tx.select().from(booking).where(inArray(booking.instanceId, ids)) : [];
  const result = propagateTemplateChange({ today, templateId, change, now, instances: rows.map(r => ({ ...r.instance, trainingClassTypeId: r.trainingClassTypeId })), bookings });
  const beforeInstances = new Map(rows.map(r => [r.instance.id, r.instance]));
  for (const next of result.instances) {
    const previous = beforeInstances.get(next.id)!;
    const { trainingClassTypeId: _type, ...values } = next;
    if (JSON.stringify(previous) === JSON.stringify(values)) continue;
    await tx.update(classInstance).set({ ...values, cancelReason: next.status === 'cancelled' && previous.status !== 'cancelled' ? 'Cambio de plantilla' : previous.cancelReason }).where(eq(classInstance.id, next.id));
  }
  const beforeBookings = new Map(bookings.map(b => [b.id, b]));
  for (const next of result.bookings) {
    const previous = beforeBookings.get(next.id)!;
    if (JSON.stringify(previous) === JSON.stringify(next)) continue;
    await tx.update(booking).set({ instanceId: next.instanceId, status: next.status, quotaReturned: next.quotaReturned, cancelledAt: next.cancelledAt, cancelledBy: next.cancelledBy === 'system' ? actorId : next.cancelledBy }).where(eq(booking.id, next.id));
  }
  return result.summary;
}
async function validateTemplate(tx: Transaction, next: ClassTemplate) {
  assertValidTimeRange(next.startTime, next.endTime);
  const hours = await getBoxHours(tx, next.boxId);
  if (!isWithinOpeningIntervals(hours.weekly.find(d => d.weekday === next.weekday)?.intervals ?? [], next.startTime, next.endTime)) throw new DomainError('SCHEDULE_CLOSED');
  if (next.coachId) {
    const [coach] = await tx.select({ role: user.role, status: user.status }).from(user).where(eq(user.id, next.coachId));
    if (!coach || coach.role === 'member' || coach.status !== 'active') throw new DomainError('FORBIDDEN');
  }
  const rows = await tx.select({ template: classTemplate, kind: classType.kind }).from(classTemplate).innerJoin(classType, eq(classTemplate.classTypeId, classType.id)).where(eq(classTemplate.boxId, next.boxId));
  if (templateConflicts(next, rows.map(r => ({ ...r.template, kind: r.kind })))) throw new DomainError('OVERLAP');
}
export async function listTemplates(db: Database, boxId: string) {
  return db.select({ template: classTemplate, classType }).from(classTemplate).innerJoin(classType, eq(classTemplate.classTypeId, classType.id)).where(and(eq(classTemplate.boxId, boxId), eq(classTemplate.active, true))).orderBy(asc(classTemplate.weekday), asc(classTemplate.startTime), asc(classTemplate.id));
}
export async function applyTemplateDraft(db: Database, input: ApplyTemplateDraft, actorId: string, now = new Date()) {
  const values = applyTemplateDraftSchema.parse(input);
  return db.transaction(async tx => {
    await lockBox(tx, values.boxId);
    const today = localDateString(now);
    const from = nextMondayDate(today);
    const future = await tx.select({ id: classInstance.id }).from(classInstance).where(and(eq(classInstance.boxId, values.boxId), gte(classInstance.date, from)));
    await lockRows(tx, future.map(i => i.id), []);
    const activeBookings = future.length ? await tx.select({ userId: booking.userId }).from(booking).where(and(inArray(booking.instanceId, future.map(i => i.id)), eq(booking.status, 'active'))) : [];
    await lockRows(tx, [], activeBookings.map(b => b.userId));
    const summary: PropagationSummary = { cancelledClassCount: 0, cancelledBookingCount: 0, movedBookingCount: 0 };
    const add = (part: PropagationSummary) => { summary.cancelledClassCount += part.cancelledClassCount; summary.cancelledBookingCount += part.cancelledBookingCount; summary.movedBookingCount += part.movedBookingCount; };
    for (const id of values.deletedIds) {
      const [existing] = await tx.select().from(classTemplate).where(eq(classTemplate.id, id));
      if (!existing || existing.boxId !== values.boxId) throw new DomainError('FORBIDDEN');
      if (!existing.active) continue;
      await tx.update(classTemplate).set({ active: false }).where(eq(classTemplate.id, id));
      add(await propagate(tx, values.boxId, id, { type: 'delete' }, actorId, today, now));
    }
    for (const patch of values.updated) {
      const [existing] = await tx.select().from(classTemplate).where(eq(classTemplate.id, patch.id));
      if (!existing?.active || existing.boxId !== values.boxId) throw new DomainError('FORBIDDEN');
      const [type] = await tx.select().from(classType).where(eq(classType.id, patch.classTypeId ?? existing.classTypeId));
      if (!type) throw new DomainError('FORBIDDEN');
      const next = { ...existing, ...patch, classTypeId: type.id, kind: type.kind };
      await validateTemplate(tx, next);
      const { kind: _kind, ...fields } = next;
      await tx.update(classTemplate).set(fields).where(eq(classTemplate.id, patch.id));
      add(await propagate(tx, values.boxId, patch.id, { type: 'update', template: next }, actorId, today, now));
    }
    for (const slot of values.created) {
      const [type] = await tx.select().from(classType).where(eq(classType.id, slot.classTypeId));
      if (!type) throw new DomainError('FORBIDDEN');
      const next = { ...slot, id: crypto.randomUUID(), boxId: values.boxId, kind: type.kind, coachId: slot.coachId ?? null, active: true };
      await validateTemplate(tx, next);
      const { kind: _kind, ...fields } = next;
      await tx.insert(classTemplate).values(fields);
    }
    // Existing updates apply next Monday; newly created slots also populate the
    // current rolling horizon, matching the existing draft-publication behavior.
    const range = horizonRange(today);
    await ensureBoxInstances(tx, values.boxId, from, range.to);
    if (values.created.length) await ensureBoxInstances(tx, values.boxId, range.from, range.to);
    return { summary };
  });
}
export async function createTemplate(db: Database, input: TemplateWrite, actorId: string, now = new Date()) {
  const values = templateWriteSchema.parse(input);
  const boxId = values.boxId ?? (await db.select({ id: box.id }).from(box).orderBy(asc(box.createdAt), asc(box.id)).limit(1))[0]?.id;
  if (!boxId) throw new DomainError('FORBIDDEN');
  return applyTemplateDraft(db, { boxId, deletedIds: [], updated: [], created: [values] }, actorId, now);
}
export async function updateTemplate(db: Database, id: string, input: PatchTemplate, actorId: string, now = new Date()) {
  const patch = patchTemplateSchema.parse(input);
  const [existing] = await db.select({ boxId: classTemplate.boxId }).from(classTemplate).where(eq(classTemplate.id, id));
  if (!existing) throw new DomainError('FORBIDDEN');
  return applyTemplateDraft(db, { boxId: existing.boxId, deletedIds: [], updated: [{ id, ...patch }], created: [] }, actorId, now);
}
export async function deleteTemplate(db: Database, id: string, actorId: string, now = new Date()) {
  const [existing] = await db.select({ boxId: classTemplate.boxId }).from(classTemplate).where(eq(classTemplate.id, id));
  if (!existing) throw new DomainError('FORBIDDEN');
  return applyTemplateDraft(db, { boxId: existing.boxId, deletedIds: [id], updated: [], created: [] }, actorId, now);
}
