import { MissingResource } from "./errors.ts";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  DomainError,
  trainingWriteSchema,
  trainingPatchSchema,
  assertDirectedClassType,
  resolveTrainingName,
  requireDetachConfirm,
  type TrainingWrite,
  type TrainingPatch,
} from "@78feet/domain";
import type { Database, Transaction } from "@78feet/db/connection";
import {
  box,
  classInstance,
  classType,
  training,
  trainingPhase,
  trainingBlock,
} from "@78feet/db/schema";
import { lockRows } from "./bookings.ts";
import { lockBox } from "./schedule.ts";

export async function getTraining(db: Database | Transaction, id: string) {
  const [row] = await db
    .select({ training, classType })
    .from(training)
    .innerJoin(classType, eq(training.classTypeId, classType.id))
    .where(eq(training.id, id));
  if (!row) throw new MissingResource("El entrenamiento no existe");
  const phases = await db
    .select()
    .from(trainingPhase)
    .where(eq(trainingPhase.trainingId, id))
    .orderBy(asc(trainingPhase.position), asc(trainingPhase.id));
  const blocks = phases.length
    ? await db
        .select()
        .from(trainingBlock)
        .where(
          inArray(
            trainingBlock.phaseId,
            phases.map((p) => p.id),
          ),
        )
        .orderBy(asc(trainingBlock.position), asc(trainingBlock.id))
    : [];
  return {
    id: row.training.id,
    name: row.training.name,
    classTypeId: row.classType.id,
    classTypeName: row.classType.name,
    phases: phases.map((p) => ({
      id: p.id,
      name: p.name,
      blocks: blocks
        .filter((b) => b.phaseId === p.id)
        .map((b) => ({ id: b.id, body: b.body })),
    })),
  };
}
async function lockTrainingWrites(tx: Transaction, id?: string) {
  // Serializes normalized names. Boxes precede instances so assignment and
  // deletion cannot deadlock on the training FK while holding a class row.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(78004, 1)`);
  const boxes = await tx.select({ id: box.id }).from(box).orderBy(asc(box.id));
  for (const b of boxes) await lockBox(tx, b.id);
  if (id) {
    const instances = await tx
      .select({ id: classInstance.id })
      .from(classInstance)
      .where(eq(classInstance.trainingId, id));
    await lockRows(
      tx,
      instances.map((i) => i.id),
      [],
    );
  }
}
async function replacePhases(
  tx: Transaction,
  id: string,
  phases: TrainingWrite["phases"],
) {
  await tx.delete(trainingPhase).where(eq(trainingPhase.trainingId, id));
  for (const [position, phase] of phases.entries()) {
    const [created] = await tx
      .insert(trainingPhase)
      .values({ trainingId: id, name: phase.name, position })
      .returning({ id: trainingPhase.id });
    await tx.insert(trainingBlock).values(
      phase.blocks.map((block, position) => ({
        phaseId: created.id,
        body: block.body,
        position,
      })),
    );
  }
}
async function trainingName(
  tx: Transaction,
  input: string,
  now: Date,
  exclude?: string,
) {
  const names = await tx
    .select({ name: training.name })
    .from(training)
    .where(exclude ? ne(training.id, exclude) : undefined);
  return resolveTrainingName(
    input,
    names.map((n) => n.name),
    now,
  );
}
async function requireDirectedType(tx: Transaction, id: string) {
  const [type] = await tx
    .select({ kind: classType.kind })
    .from(classType)
    .where(eq(classType.id, id));
  if (!type) throw new DomainError("FORBIDDEN");
  assertDirectedClassType(type.kind);
}
export async function createTraining(
  db: Database,
  input: TrainingWrite,
  now = new Date(),
) {
  const values = trainingWriteSchema.parse(input);
  return db.transaction(async (tx) => {
    await lockTrainingWrites(tx);
    await requireDirectedType(tx, values.classTypeId);
    const name = await trainingName(tx, values.name, now);
    const [created] = await tx
      .insert(training)
      .values({
        name,
        classTypeId: values.classTypeId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: training.id });
    await replacePhases(tx, created.id, values.phases);
    return getTraining(tx, created.id);
  });
}
export async function updateTraining(
  db: Database,
  id: string,
  input: TrainingPatch,
  now = new Date(),
) {
  const patch = trainingPatchSchema.parse(input);
  return db.transaction(async (tx) => {
    await lockTrainingWrites(tx, id);
    const [existing] = await tx
      .select()
      .from(training)
      .where(eq(training.id, id));
    if (!existing) throw new DomainError("FORBIDDEN");
    const classTypeId = patch.classTypeId ?? existing.classTypeId;
    await requireDirectedType(tx, classTypeId);
    const links = await tx
      .select({ id: classInstance.id })
      .from(classInstance)
      .where(
        and(
          eq(classInstance.trainingId, id),
          ne(classInstance.classTypeId, classTypeId),
        ),
      );
    requireDetachConfirm(links.length, patch.confirmDetach === true);
    if (links.length)
      await tx
        .update(classInstance)
        .set({ trainingId: null })
        .where(
          inArray(
            classInstance.id,
            links.map((l) => l.id),
          ),
        );
    const name =
      patch.name === undefined
        ? existing.name
        : await trainingName(tx, patch.name, now, id);
    await tx
      .update(training)
      .set({ name, classTypeId, updatedAt: now })
      .where(eq(training.id, id));
    if (patch.phases) await replacePhases(tx, id, patch.phases);
    return { training: await getTraining(tx, id), detachedCount: links.length };
  });
}
export async function deleteTraining(
  db: Database,
  id: string,
  confirmDetach = false,
) {
  return db.transaction(async (tx) => {
    await lockTrainingWrites(tx, id);
    const [existing] = await tx
      .select({ id: training.id })
      .from(training)
      .where(eq(training.id, id));
    if (!existing) throw new DomainError("FORBIDDEN");
    const links = await tx
      .select({ id: classInstance.id })
      .from(classInstance)
      .where(eq(classInstance.trainingId, id));
    requireDetachConfirm(links.length, confirmDetach);
    await tx
      .update(classInstance)
      .set({ trainingId: null })
      .where(eq(classInstance.trainingId, id));
    await tx.delete(training).where(eq(training.id, id));
    return { ok: true, detachedCount: links.length };
  });
}
