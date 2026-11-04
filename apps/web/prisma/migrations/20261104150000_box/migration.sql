CREATE TABLE "box" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "weekly_hours" JSONB NOT NULL,
    "exceptions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "box_name_key" ON "box"("name");

INSERT INTO "box" ("id", "name", "weekly_hours", "exceptions")
SELECT gen_random_uuid(), 'Box 1', settings."weekly_hours", settings."exceptions"
FROM "box_settings" AS settings
ORDER BY CASE WHEN settings."id" = 'default' THEN 0 ELSE 1 END, settings."id"
LIMIT 1;

INSERT INTO "box" ("id", "name", "weekly_hours", "exceptions")
SELECT
    gen_random_uuid(),
    'Box 1',
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'weekday', weekday,
                'intervals', jsonb_build_array(
                    jsonb_build_object('openTime', '07:00', 'closeTime', '21:00')
                )
            )
            ORDER BY weekday
        )
        FROM generate_series(1, 7) AS days(weekday)
    ),
    '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "box");

ALTER TABLE "class_template" ADD COLUMN "box_id" UUID;
ALTER TABLE "class_instance" ADD COLUMN "box_id" UUID;

UPDATE "class_template"
SET "box_id" = (SELECT "id" FROM "box" ORDER BY "created_at" ASC, "id" ASC LIMIT 1)
WHERE "box_id" IS NULL;

UPDATE "class_instance"
SET "box_id" = (SELECT "id" FROM "box" ORDER BY "created_at" ASC, "id" ASC LIMIT 1)
WHERE "box_id" IS NULL;

ALTER TABLE "class_template" ALTER COLUMN "box_id" SET NOT NULL;
ALTER TABLE "class_instance" ALTER COLUMN "box_id" SET NOT NULL;

ALTER TABLE "class_template"
ADD CONSTRAINT "class_template_box_id_fkey"
FOREIGN KEY ("box_id") REFERENCES "box"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "class_instance"
ADD CONSTRAINT "class_instance_box_id_fkey"
FOREIGN KEY ("box_id") REFERENCES "box"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "class_template_box_id_idx" ON "class_template"("box_id");
CREATE INDEX "class_instance_box_id_idx" ON "class_instance"("box_id");

DROP TABLE "box_settings";
