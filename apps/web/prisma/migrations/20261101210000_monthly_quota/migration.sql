CREATE TYPE "QuotaPeriod" AS ENUM ('week', 'month');

ALTER TYPE "BookingPool" RENAME VALUE 'weekly_directed' TO 'quota_directed';
ALTER TYPE "BookingPool" RENAME VALUE 'weekly_open' TO 'quota_open';

ALTER TABLE "tariff" RENAME COLUMN "weekly_directed" TO "quota_directed";
ALTER TABLE "tariff" RENAME COLUMN "weekly_open" TO "quota_open";

ALTER TABLE "weekly_quota_adjustment" RENAME TO "quota_adjustment";
ALTER TABLE "quota_adjustment" RENAME COLUMN "week_start" TO "period_start";
ALTER TABLE "quota_adjustment" ADD COLUMN "period" "QuotaPeriod" NOT NULL DEFAULT 'week';
ALTER INDEX "weekly_quota_adjustment_user_id_week_start_idx" RENAME TO "quota_adjustment_user_id_period_period_start_idx";
ALTER TABLE "quota_adjustment" RENAME CONSTRAINT "weekly_quota_adjustment_pkey" TO "quota_adjustment_pkey";
ALTER TABLE "quota_adjustment" RENAME CONSTRAINT "weekly_quota_adjustment_delta_nonzero" TO "quota_adjustment_delta_nonzero";
ALTER TABLE "quota_adjustment" RENAME CONSTRAINT "weekly_quota_adjustment_user_id_fkey" TO "quota_adjustment_user_id_fkey";
ALTER TABLE "quota_adjustment" RENAME CONSTRAINT "weekly_quota_adjustment_created_by_fkey" TO "quota_adjustment_created_by_fkey";

DROP INDEX "quota_adjustment_user_id_period_period_start_idx";
CREATE INDEX "quota_adjustment_user_id_period_period_start_idx" ON "quota_adjustment"("user_id", "period", "period_start");
