import type { ClassKind, QuotaPeriod } from "@78feet/domain";
import type { Db } from "./db";

export type QuotaAdjustmentPick = { kind: ClassKind; delta: number };

type CreatedAdjustment = {
  id: string;
  kind: ClassKind;
  delta: number;
  note: string | null;
  createdAt: Date;
};

export async function listQuotaAdjustments(
  db: Db,
  userId: string,
  period: QuotaPeriod,
  periodStart: Date,
): Promise<QuotaAdjustmentPick[]> {
  const model = (db as { quotaAdjustment?: { findMany?: unknown } }).quotaAdjustment;
  if (typeof model?.findMany === "function") {
    return db.quotaAdjustment.findMany({
      where: { userId, period, periodStart },
      select: { kind: true, delta: true },
    });
  }
  return db.$queryRaw<QuotaAdjustmentPick[]>`
    SELECT kind, delta
    FROM quota_adjustment
    WHERE user_id = ${userId}::uuid
      AND period = ${period}::"QuotaPeriod"
      AND period_start = ${periodStart}::date
  `;
}

export async function createQuotaAdjustment(
  db: Db,
  data: {
    userId: string;
    period: QuotaPeriod;
    periodStart: Date;
    kind: ClassKind;
    delta: number;
    note: string | null;
    createdBy: string;
  },
): Promise<CreatedAdjustment> {
  const model = (db as { quotaAdjustment?: { create?: unknown } }).quotaAdjustment;
  if (typeof model?.create === "function") {
    const row = await db.quotaAdjustment.create({ data });
    return {
      id: row.id,
      kind: row.kind,
      delta: row.delta,
      note: row.note,
      createdAt: row.createdAt,
    };
  }
  const rows = await db.$queryRaw<CreatedAdjustment[]>`
    INSERT INTO quota_adjustment (id, user_id, period, period_start, kind, delta, note, created_by)
    VALUES (
      gen_random_uuid(),
      ${data.userId}::uuid,
      ${data.period}::"QuotaPeriod",
      ${data.periodStart}::date,
      ${data.kind}::"ClassKind",
      ${data.delta},
      ${data.note},
      ${data.createdBy}::uuid
    )
    RETURNING id, kind, delta, note, created_at AS "createdAt"
  `;
  const row = rows[0];
  if (!row) throw new Error("No se creó el ajuste de cupo");
  return row;
}
