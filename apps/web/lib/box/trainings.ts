import {
  assertDirectedClassType,
  assertTrainingContent,
  requireDetachConfirm,
  type TrainingPatch,
  type TrainingWrite,
} from "@78feet/domain";
import { prisma } from "../db";
import type { Db } from "./db";
import { BoxError } from "./errors";
import { requireClassType } from "./class-types";
import { typeView } from "./map";

const trainingInclude = {
  classType: true,
  phases: { include: { blocks: { orderBy: { position: "asc" as const } } }, orderBy: { position: "asc" as const } },
} as const;

function trainingView(
  row: {
    id: string;
    name: string;
    classTypeId: string;
    createdAt: Date;
    updatedAt: Date;
    classType: { id: string; name: string; kind: "directed" | "open"; imageKey: string };
    phases: { id: string; name: string; position: number; blocks: { id: string; body: string; position: number }[] }[];
  },
  linkedCount?: number,
) {
  return {
    id: row.id,
    name: row.name,
    classTypeId: row.classTypeId,
    classType: typeView(row.classType),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    phases: row.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      position: phase.position,
      blocks: phase.blocks.map((block) => ({
        id: block.id,
        body: block.body,
        position: block.position,
      })),
    })),
    ...(linkedCount === undefined ? {} : { linkedCount }),
  };
}

export function trainingCard(row: {
  id: string;
  name: string;
  updatedAt: Date;
  classType: { id: string; name: string; kind: "directed" | "open"; imageKey: string };
}) {
  return {
    id: row.id,
    name: row.name,
    classTypeId: row.classType.id,
    classTypeName: row.classType.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTrainings(classTypeId?: string) {
  const rows = await prisma.training.findMany({
    where: classTypeId ? { classTypeId } : undefined,
    include: { classType: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(trainingCard);
}

export async function listTrainingFilterTypes() {
  const rows = await prisma.classType.findMany({
    where: { kind: "directed", trainings: { some: {} } },
    orderBy: { name: "asc" },
  });
  return rows.map(typeView);
}

export async function getTraining(id: string) {
  const row = await prisma.training.findUnique({
    where: { id },
    include: trainingInclude,
  });
  if (!row) throw new BoxError(404, "FORBIDDEN", "El entrenamiento no existe");
  const linkedCount = await prisma.classInstance.count({ where: { trainingId: id } });
  return trainingView(row, linkedCount);
}

async function replacePhases(db: Db, trainingId: string, phases: TrainingWrite["phases"]) {
  await db.trainingPhase.deleteMany({ where: { trainingId } });
  for (const [phaseIndex, phase] of phases.entries()) {
    const created = await db.trainingPhase.create({
      data: { trainingId, name: phase.name, position: phaseIndex },
    });
    for (const [blockIndex, block] of phase.blocks.entries()) {
      await db.trainingBlock.create({
        data: { phaseId: created.id, body: block.body, position: blockIndex },
      });
    }
  }
}

export async function createTraining(input: TrainingWrite) {
  const classType = await requireClassType(input.classTypeId);
  assertDirectedClassType(classType.kind);
  assertTrainingContent(input.phases);
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.training.create({
      data: { name: input.name, classTypeId: input.classTypeId },
    });
    await replacePhases(tx, created.id, input.phases);
    return tx.training.findUniqueOrThrow({ where: { id: created.id }, include: trainingInclude });
  });
  return trainingView(row, 0);
}

export async function updateTraining(id: string, patch: TrainingPatch) {
  const existing = await prisma.training.findUnique({
    where: { id },
    include: trainingInclude,
  });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "El entrenamiento no existe");
  const nextTypeId = patch.classTypeId ?? existing.classTypeId;
  const classType = nextTypeId === existing.classTypeId ? existing.classType : await requireClassType(nextTypeId);
  assertDirectedClassType(classType.kind);
  const phases = patch.phases ?? existing.phases.map((phase) => ({
    name: phase.name,
    blocks: phase.blocks.map((block) => ({ body: block.body })),
  }));
  assertTrainingContent(phases);

  const wouldDetach =
    nextTypeId !== existing.classTypeId
      ? await prisma.classInstance.count({
          where: { trainingId: id, classTypeId: { not: nextTypeId } },
        })
      : 0;
  requireDetachConfirm(wouldDetach, patch.confirmDetach === true);

  const row = await prisma.$transaction(async (tx) => {
    if (wouldDetach > 0) {
      await tx.classInstance.updateMany({
        where: { trainingId: id, classTypeId: { not: nextTypeId } },
        data: { trainingId: null },
      });
    }
    await tx.training.update({
      where: { id },
      data: { name: patch.name ?? existing.name, classTypeId: nextTypeId },
    });
    if (patch.phases) await replacePhases(tx, id, patch.phases);
    else {
      await tx.training.update({ where: { id }, data: { updatedAt: new Date() } });
    }
    return tx.training.findUniqueOrThrow({ where: { id }, include: trainingInclude });
  });
  const linkedCount = await prisma.classInstance.count({ where: { trainingId: id } });
  return { training: trainingView(row, linkedCount), detachedCount: wouldDetach };
}

export async function deleteTraining(id: string, confirmDetach = false) {
  const existing = await prisma.training.findUnique({ where: { id } });
  if (!existing) throw new BoxError(404, "FORBIDDEN", "El entrenamiento no existe");
  const linkedCount = await prisma.classInstance.count({ where: { trainingId: id } });
  requireDetachConfirm(linkedCount, confirmDetach);
  await prisma.$transaction(async (tx) => {
    await tx.classInstance.updateMany({ where: { trainingId: id }, data: { trainingId: null } });
    await tx.training.delete({ where: { id } });
  });
  return { ok: true, detachedCount: linkedCount };
}
