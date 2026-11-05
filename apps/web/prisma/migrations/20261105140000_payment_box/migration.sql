ALTER TABLE "payment" ADD COLUMN "payment_box_id" UUID;

UPDATE "payment" AS p
SET "payment_box_id" = u."payment_box_id"
FROM "user" AS u
WHERE p."user_id" = u."id" AND u."payment_box_id" IS NOT NULL;

UPDATE "payment"
SET "payment_box_id" = first_box."id"
FROM (
    SELECT "id" FROM "box" ORDER BY "created_at" ASC, "id" ASC LIMIT 1
) AS first_box
WHERE "payment"."payment_box_id" IS NULL;

ALTER TABLE "payment" ALTER COLUMN "payment_box_id" SET NOT NULL;

ALTER TABLE "payment"
ADD CONSTRAINT "payment_payment_box_id_fkey"
FOREIGN KEY ("payment_box_id") REFERENCES "box"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "payment_payment_box_id_created_at_idx" ON "payment"("payment_box_id", "created_at" DESC);
