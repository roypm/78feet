import { and, eq, isNull, sql } from "drizzle-orm";
import { DomainError, memberCanCancel, weekdayMonday1 } from "@78feet/domain";
import type { Database } from "@78feet/db/connection";
import {
  booking,
  classInstance,
  classTemplate,
  box,
  membership,
  tariff,
  training,
  classType,
} from "@78feet/db/schema";
import { getPerson } from "@78feet/application/queries";
import { getInstanceDetail } from "@78feet/application/calendar";
import { getTraining } from "@78feet/application/trainings";

export const imageUrl = (key: string | null) =>
  key ? `/api/v1/class-type-images/${encodeURIComponent(key)}` : null;
export async function memberView(db: Database, id: string) {
  const person = await getPerson(db, id, "member");
  const [current] = await db
    .select({ membership, tariff })
    .from(membership)
    .innerJoin(tariff, eq(membership.tariffId, tariff.id))
    .where(and(eq(membership.userId, id), isNull(membership.endedAt)));
  const [paymentBox] = person.paymentBoxId
    ? await db
        .select({ name: box.name })
        .from(box)
        .where(eq(box.id, String(person.paymentBoxId)))
    : [];
  return {
    ...person,
    paymentBoxName: paymentBox?.name ?? null,
    membership: current
      ? {
          id: current.membership.id,
          tariffId: current.tariff.id,
          tariffName: current.tariff.name,
          consumptionModel: current.tariff.consumptionModel,
          billingPeriod: current.tariff.billingPeriod,
          priceCents: current.tariff.priceCents,
          startedAt: current.membership.startedAt,
          endedAt: current.membership.endedAt,
        }
      : null,
  };
}
export async function trainingView(db: Database, id: string) {
  const detail = await getTraining(db, id);
  const [row] = await db
    .select({ training, classType })
    .from(training)
    .innerJoin(classType, eq(training.classTypeId, classType.id))
    .where(eq(training.id, id));
  const phases = await db.execute<{ id: string; position: number }>(
    sql`SELECT id,position FROM training_phase WHERE training_id=${id}::uuid`,
  );
  const blocks = await db.execute<{ id: string; position: number }>(
    sql`SELECT b.id,b.position FROM training_block b JOIN training_phase p ON p.id=b.phase_id WHERE p.training_id=${id}::uuid`,
  );
  const assigned = await db
    .select({ id: classInstance.id })
    .from(classInstance)
    .where(eq(classInstance.trainingId, id))
    .limit(1);
  return {
    ...detail,
    classType: { ...row.classType, imageUrl: imageUrl(row.classType.imageKey) },
    createdAt: row.training.createdAt,
    updatedAt: row.training.updatedAt,
    hasAssignedClasses: assigned.length > 0,
    phases: detail.phases.map((p) => ({
      ...p,
      position: phases.rows.find((r) => r.id === p.id)!.position,
      blocks: p.blocks.map((b) => ({
        ...b,
        position: blocks.rows.find((r) => r.id === b.id)!.position,
      })),
    })),
  };
}
export async function staffInstanceView(
  db: Database,
  id: string,
  viewer: { id: string; role: string },
  now = new Date(),
) {
  const detail = await getInstanceDetail(db, viewer, id, now);
  const [row] = await db
    .select({ instance: classInstance, box, template: classTemplate })
    .from(classInstance)
    .innerJoin(box, eq(classInstance.boxId, box.id))
    .leftJoin(classTemplate, eq(classInstance.templateId, classTemplate.id))
    .where(eq(classInstance.id, id));
  const count = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int n FROM booking WHERE instance_id=${id}::uuid`,
  );
  const i = row.instance;
  return {
    ...detail,
    boxSlug: row.box.slug,
    coachId: i.coachId,
    trainingName: detail.training?.name ?? null,
    editedAt: i.editedAt,
    isExtra: !i.templateId,
    isModified: !!i.templateId && !!i.editedAt,
    canRemoveExtra: !i.templateId && i.startAt > now,
    canRecover: i.status === "cancelled" && i.startAt > now,
    canRestoreFromTemplate:
      !!i.editedAt &&
      !!row.template?.active &&
      i.startAt > now &&
      weekdayMonday1(i.date) === row.template.weekday,
    bookingHistoryCount: count.rows[0].n,
    cancelReason: i.cancelReason,
  };
}
export async function bookingView(db: Database, id: string) {
  const [row] = await db
    .select({ booking, instance: classInstance, type: classType, box })
    .from(booking)
    .innerJoin(classInstance, eq(booking.instanceId, classInstance.id))
    .innerJoin(classType, eq(classInstance.classTypeId, classType.id))
    .innerJoin(box, eq(classInstance.boxId, box.id))
    .where(eq(booking.id, id));
  if (!row) throw new DomainError("FORBIDDEN");
  return {
    ...row.booking,
    instance: {
      id: row.instance.id,
      date: row.instance.date,
      name: row.type.name,
      boxName: row.box.name,
      kind: row.instance.kind,
      startAt: row.instance.startAt,
      endAt: row.instance.endAt,
      capacity: row.instance.capacity,
      status: row.instance.status,
    },
  };
}
