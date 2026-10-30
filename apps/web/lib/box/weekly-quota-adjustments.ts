import type { ClassKind } from "@78feet/domain";
import type { Db } from "./db";

export type WeeklyQuotaAdjustmentPick = { kind: ClassKind; delta: number };

type CreatedAdjustment = {
  id: string;
  kind: ClassKind;
  delta: number;
  note: string | null;
  createdAt: Date;
};

function hasWeeklyQuotaModel(db: Db): boolean {
  const model = (db as { weeklyQuotaAdjustment?: { findMany?: unknown; create?: unknown } }).weeklyQuotaAdjustment;
  return typeof model?.findMany === "function" && typeof model?.create === "function";
}

export async function listWeeklyQuotaAdjustments(
  db: Db,
  userId: string,
  weekStart: Date,
): Promise<WeeklyQuotaAdjustmentPick[]> {
  if (hasWeeklyQuotaModel(db)) {
    return db.weeklyQuotaAdjustment.findMany({
      where: { userId, weekStart },
      select: { kind: true, delta: true },
    });
  }
  return db.$queryRaw<WeeklyQuotaAdjustmentPick[]>`
    SELECT kind, delta
    FROM weekly_quota_adjustment
    WHERE user_id = ${userId}::uuid
      AND week_start = ${weekStart}::date
  `;
}

export async function createWeeklyQuotaAdjustment(
  db: Db,
  data: {
    userId: string;
    weekStart: Date;
    kind: ClassKind;
    delta: number;
    note: string | null;
    createdBy: string;
  },
): Promise<CreatedAdjustment> {
  if (hasWeeklyQuotaModel(db)) {
    const row = await db.weeklyQuotaAdjustment.create({ data });
    return {
      id: row.id,
      kind: row.kind,
      delta: row.delta,
      note: row.note,
      createdAt: row.createdAt,
    };
  }
  const rows = await db.$queryRaw<CreatedAdjustment[]>`
    INSERT INTO weekly_quota_adjustment (id, user_id, week_start, kind, delta, note, created_by)
    VALUES (
      gen_random_uuid(),
      ${data.userId}::uuid,
      ${data.weekStart}::date,
      ${data.kind}::"ClassKind",
      ${data.delta},
      ${data.note},
      ${data.createdBy}::uuid
    )
    RETURNING id, kind, delta, note, created_at AS "createdAt"
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("No se creó el ajuste de cupo");
  }
  return row;
}
