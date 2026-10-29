CREATE TABLE "class_type" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ClassKind" NOT NULL,
    "image_key" TEXT NOT NULL,

    CONSTRAINT "class_type_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "box_settings" (
    "id" TEXT NOT NULL,
    "open_time" TIME(0) NOT NULL,
    "close_time" TIME(0) NOT NULL,

    CONSTRAINT "box_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "box_settings" ("id", "open_time", "close_time")
VALUES ('default', TIME '07:00:00', TIME '21:00:00');

INSERT INTO "class_type" ("id", "name", "kind", "image_key")
SELECT gen_random_uuid(), src."title", src."kind", 'placeholder.png'
FROM (
    SELECT DISTINCT "title", "kind" FROM "class_template"
    UNION
    SELECT DISTINCT "title", "kind" FROM "class_instance"
) AS src;

ALTER TABLE "class_template" ADD COLUMN "class_type_id" UUID;
ALTER TABLE "class_instance" ADD COLUMN "class_type_id" UUID;
ALTER TABLE "class_instance" ADD COLUMN "training_id" UUID;

UPDATE "class_template" AS t
SET "class_type_id" = ct."id"
FROM "class_type" AS ct
WHERE ct."name" = t."title" AND ct."kind" = t."kind";

UPDATE "class_instance" AS i
SET "class_type_id" = ct."id"
FROM "class_type" AS ct
WHERE ct."name" = i."title" AND ct."kind" = i."kind";

ALTER TABLE "class_template" ALTER COLUMN "class_type_id" SET NOT NULL;
ALTER TABLE "class_instance" ALTER COLUMN "class_type_id" SET NOT NULL;

ALTER TABLE "class_template" DROP COLUMN "title";
ALTER TABLE "class_template" DROP COLUMN "kind";
ALTER TABLE "class_instance" DROP COLUMN "title";

CREATE TABLE "training" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "class_type_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "training_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_phase" (
    "id" UUID NOT NULL,
    "training_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "training_phase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_block" (
    "id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "training_block_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "training_class_type_id_idx" ON "training"("class_type_id");
CREATE INDEX "training_phase_training_id_idx" ON "training_phase"("training_id");
CREATE INDEX "training_block_phase_id_idx" ON "training_block"("phase_id");

ALTER TABLE "class_template" ADD CONSTRAINT "class_template_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_instance" ADD CONSTRAINT "class_instance_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "training"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "training" ADD CONSTRAINT "training_class_type_id_fkey" FOREIGN KEY ("class_type_id") REFERENCES "class_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_phase" ADD CONSTRAINT "training_phase_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_block" ADD CONSTRAINT "training_block_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "training_phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
