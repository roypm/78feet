ALTER TABLE "user" ADD COLUMN "payment_box_id" UUID;
ALTER TABLE "user" ADD COLUMN "preference_box_id" UUID;

UPDATE "user" AS member
SET
    "payment_box_id" = first_box."id",
    "preference_box_id" = first_box."id"
FROM (
    SELECT "id" FROM "box" ORDER BY "created_at" ASC, "id" ASC LIMIT 1
) AS first_box
WHERE member."role" = 'member';

ALTER TABLE "user"
ADD CONSTRAINT "user_payment_box_id_fkey"
FOREIGN KEY ("payment_box_id") REFERENCES "box"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user"
ADD CONSTRAINT "user_preference_box_id_fkey"
FOREIGN KEY ("preference_box_id") REFERENCES "box"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "user_payment_box_id_idx" ON "user"("payment_box_id");
