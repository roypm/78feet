ALTER TABLE "credit_grant" DROP CONSTRAINT IF EXISTS "credit_grant_quantity_positive";
ALTER TABLE "credit_grant" ADD CONSTRAINT "credit_grant_quantity_nonzero" CHECK ("quantity" <> 0);

CREATE TABLE "weekly_quota_adjustment" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "kind" "ClassKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_quota_adjustment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "weekly_quota_adjustment_delta_nonzero" CHECK ("delta" <> 0)
);

CREATE INDEX "weekly_quota_adjustment_user_id_week_start_idx" ON "weekly_quota_adjustment"("user_id", "week_start");

ALTER TABLE "weekly_quota_adjustment" ADD CONSTRAINT "weekly_quota_adjustment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "weekly_quota_adjustment" ADD CONSTRAINT "weekly_quota_adjustment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
