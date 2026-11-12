import { sql } from 'drizzle-orm';
import { quotaPeriodStartDate, quotaPeriodEndDate, type QuotaPeriod } from '@78feet/domain';
import type { Transaction, Database } from '@78feet/db/connection';
export async function memberConsumption(db: Transaction | Database, userId: string, date: string, period: QuotaPeriod | null) {
  const start = period ? quotaPeriodStartDate(date, period) : null;
  const end = period ? quotaPeriodEndDate(date, period) : null;
  const result = await db.execute<{usedDirected:number;usedOpen:number;packBalance:number}>(sql`
    SELECT
      count(*) FILTER (WHERE b.pool = 'quota_directed' AND i.date BETWEEN ${start}::date AND ${end}::date)::int AS "usedDirected",
      count(*) FILTER (WHERE b.pool = 'quota_open' AND i.date BETWEEN ${start}::date AND ${end}::date)::int AS "usedOpen",
      ((SELECT coalesce(sum(quantity),0) FROM credit_grant WHERE user_id=${userId}::uuid)
        - count(*) FILTER (WHERE b.pool='pack'))::int AS "packBalance"
    FROM booking b JOIN class_instance i ON i.id=b.instance_id
    WHERE b.user_id=${userId}::uuid AND (b.status='active' OR b.quota_returned=false)`);
  return result.rows[0];
}
