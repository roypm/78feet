import {
  horizonRange,
  instanceKey,
  localDateString,
  planMaterializedInstances,
} from "@78feet/domain";
import { prisma } from "../db";
import type { Db } from "./db";
import { isUniqueViolation } from "./db";
import { toDomainTemplate } from "./map";
import { isoDateFromDb, isoDateToDb } from "./time";
import { getBoxHours, isDateOpenDuring } from "./hours";

function clockAtBoxTime(value: Date): string {
  return value.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
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
    include: { classType: true },
  });
  const templates = rows.map(toDomainTemplate);
  if (templates.length === 0) return 0;
  const hours = await getBoxHours(db);

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
  const planned = planMaterializedInstances({ templates, existingKeys, from, to }).filter((instance) =>
    isDateOpenDuring(hours, instance.date, clockAtBoxTime(instance.startAt), clockAtBoxTime(instance.endAt)),
  );
  let created = 0;
  for (const instance of planned) {
    try {
      await db.classInstance.create({
        data: {
          templateId: instance.templateId,
          date: isoDateToDb(instance.date),
          startAt: instance.startAt,
          endAt: instance.endAt,
          classTypeId: instance.classTypeId,
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
