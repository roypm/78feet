import { MissingResource } from "./errors.ts";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import {
  DomainError,
  boxHoursConfigSchema,
  isOpenDuring,
  isWithinOpeningIntervals,
  planMaterializedInstances,
  instanceKey,
  horizonRange,
  localDateString,
  type BoxHoursConfig,
} from "@78feet/domain";
import type { Database, Transaction } from "@78feet/db/connection";
import {
  box,
  classTemplate,
  classType,
  classInstance,
} from "@78feet/db/schema";

export function instanceClock(value: Date) {
  return value.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}
export async function lockBox(tx: Transaction, id: string) {
  const result = await tx.execute(
    sql`SELECT id FROM box WHERE id=${id}::uuid FOR NO KEY UPDATE`,
  );
  if (!result.rowCount) throw new MissingResource("El box no existe");
}
export async function getBoxHours(
  db: Database | Transaction,
  id: string,
): Promise<BoxHoursConfig> {
  const [row] = await db
    .select({ weekly: box.weeklyHours, exceptions: box.exceptions })
    .from(box)
    .where(eq(box.id, id));
  if (!row) throw new MissingResource("El box no existe");
  return boxHoursConfigSchema.parse(row);
}
export async function updateBoxHours(
  db: Database,
  id: string,
  input: BoxHoursConfig,
  now = new Date(),
) {
  const config = boxHoursConfigSchema.parse(input);
  return db.transaction(async (tx) => {
    await lockBox(tx, id);
    const templates = await tx
      .select()
      .from(classTemplate)
      .where(and(eq(classTemplate.boxId, id), eq(classTemplate.active, true)));
    const instances = await tx
      .select()
      .from(classInstance)
      .where(
        and(
          eq(classInstance.boxId, id),
          eq(classInstance.status, "scheduled"),
          sql`${classInstance.startAt}>${now}`,
        ),
      );
    if (
      templates.some(
        (t) =>
          !isWithinOpeningIntervals(
            config.weekly.find((d) => d.weekday === t.weekday)?.intervals ?? [],
            t.startTime,
            t.endTime,
          ),
      ) ||
      instances.some(
        (i) =>
          !isOpenDuring(
            config,
            i.date,
            instanceClock(i.startAt),
            instanceClock(i.endAt),
          ),
      )
    ) {
      throw new DomainError(
        "SCHEDULE_CLOSED",
        "Hay plantillas o clases programadas fuera del horario propuesto",
      );
    }
    await tx
      .update(box)
      .set({ weeklyHours: config.weekly, exceptions: config.exceptions })
      .where(eq(box.id, id));
    return config;
  });
}

// Reuses the same transaction as template publication. The box lock coordinates
// materialization with closure/hour changes and publication across processes.
export async function ensureBoxInstances(
  tx: Transaction,
  boxId: string,
  from: string,
  to: string,
) {
  await lockBox(tx, boxId);
  const hours = await getBoxHours(tx, boxId);
  const templates = await tx
    .select({ template: classTemplate, kind: classType.kind })
    .from(classTemplate)
    .innerJoin(classType, eq(classTemplate.classTypeId, classType.id))
    .where(and(eq(classTemplate.boxId, boxId), eq(classTemplate.active, true)));
  const existing = await tx
    .select({ templateId: classInstance.templateId, date: classInstance.date })
    .from(classInstance)
    .where(
      and(
        eq(classInstance.boxId, boxId),
        gte(classInstance.date, from),
        lte(classInstance.date, to),
      ),
    );
  const planned = planMaterializedInstances({
    templates: templates.map((t) => ({ ...t.template, kind: t.kind })),
    existingKeys: new Set(
      existing.flatMap((i) =>
        i.templateId ? [instanceKey(i.templateId, i.date)] : [],
      ),
    ),
    from,
    to,
  }).filter((i) =>
    isOpenDuring(
      hours,
      i.date,
      instanceClock(i.startAt),
      instanceClock(i.endAt),
    ),
  );
  let created = 0;
  for (const instance of planned) {
    const inserted = await tx
      .insert(classInstance)
      .values(instance)
      .onConflictDoNothing({
        target: [classInstance.templateId, classInstance.date],
        where: sql`template_id IS NOT NULL`,
      })
      .returning({ id: classInstance.id });
    created += inserted.length;
  }
  return created;
}
export async function materializeHorizon(db: Database, now = new Date()) {
  const range = horizonRange(localDateString(now));
  const boxes = await db.select({ id: box.id }).from(box).orderBy(asc(box.id));
  let created = 0;
  for (const item of boxes)
    created += await db.transaction((tx) =>
      ensureBoxInstances(tx, item.id, range.from, range.to),
    );
  return { ...range, created };
}
