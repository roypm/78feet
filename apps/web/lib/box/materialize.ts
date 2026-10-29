import {
  horizonRange,
  instanceKey,
  localDateString,
  planMaterializedInstances,
} from "@78feet/domain";
import type { ClassTemplate as DomainTemplate } from "@78feet/domain";
import { prisma } from "../db";
import type { Db } from "./db";
import { isUniqueViolation } from "./db";
import { clockFromDb, isoDateFromDb, isoDateToDb } from "./time";

function toDomainTemplate(row: {
  id: string;
  weekday: number;
  startTime: Date;
  endTime: Date;
  title: string;
  kind: "directed" | "open";
  coachId: string | null;
  defaultCapacity: number;
  active: boolean;
}): DomainTemplate {
  return {
    id: row.id,
    weekday: row.weekday,
    startTime: clockFromDb(row.startTime),
    endTime: clockFromDb(row.endTime),
    title: row.title,
    kind: row.kind,
    coachId: row.coachId,
    defaultCapacity: row.defaultCapacity,
    active: row.active,
  };
}

export async function ensureInstances(
  db: Db,
  from: string,
  to: string,
  templateId?: string,
): Promise<number> {
  if (from > to) return 0;
  const rows = await db.classTemplate.findMany({
    where: { active: true, ...(templateId ? { id: templateId } : {}) },
  });
  const templates = rows.map(toDomainTemplate);
  if (templates.length === 0) return 0;

  const existing = await db.classInstance.findMany({
    where: {
      templateId: { in: templates.map((template) => template.id) },
      date: { gte: isoDateToDb(from), lte: isoDateToDb(to) },
    },
    select: { templateId: true, date: true },
  });
  const existingKeys = new Set(
    existing.flatMap((row) =>
      row.templateId ? [instanceKey(row.templateId, isoDateFromDb(row.date))] : [],
    ),
  );
  const planned = planMaterializedInstances({ templates, existingKeys, from, to });
  let created = 0;
  for (const instance of planned) {
    try {
      await db.classInstance.create({
        data: {
          templateId: instance.templateId,
          date: isoDateToDb(instance.date),
          startAt: instance.startAt,
          endAt: instance.endAt,
          title: instance.title,
          kind: instance.kind,
          coachId: instance.coachId,
          capacity: instance.capacity,
          status: "scheduled",
        },
      });
      created += 1;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return created;
}

export async function materializeHorizon(now = new Date()): Promise<{
  created: number;
  from: string;
  to: string;
}> {
  const today = localDateString(now);
  const range = horizonRange(today);
  const created = await ensureInstances(prisma, range.from, range.to);
  return { created, from: range.from, to: range.to };
}
