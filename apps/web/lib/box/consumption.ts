import { quotaPeriodEndDate, quotaPeriodStartDate, type QuotaPeriod } from "@78feet/domain";
import type { Db } from "./db";
import { isoDateToDb } from "./time";

/** Historical pack consumption is counted in SQL; periodic quota only needs the requested period. */
export async function memberConsumption(db: Db, userId: string, date: string, period: QuotaPeriod | null) {
  const consumed = { userId, OR: [{ status: "active" as const }, { quotaReturned: false }] };
  const [grants, packs, quotas] = await Promise.all([
    db.creditGrant.aggregate({ where: { userId }, _sum: { quantity: true } }),
    db.booking.count({ where: { ...consumed, pool: "pack" } }),
    period
      ? db.booking.groupBy({
          by: ["pool"],
          where: {
            ...consumed,
            pool: { in: ["quota_directed", "quota_open"] },
            instance: {
              date: {
                gte: isoDateToDb(quotaPeriodStartDate(date, period)),
                lte: isoDateToDb(quotaPeriodEndDate(date, period)),
              },
            },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);
  return {
    usedDirected: quotas.find((row) => row.pool === "quota_directed")?._count._all ?? 0,
    usedOpen: quotas.find((row) => row.pool === "quota_open")?._count._all ?? 0,
    packBalance: (grants._sum.quantity ?? 0) - packs,
  };
}
