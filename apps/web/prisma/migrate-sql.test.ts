import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const root = dirname(fileURLToPath(import.meta.url));
const sql = [
  readFileSync(join(root, "migrations/20261029100000_init/migration.sql"), "utf8"),
  readFileSync(join(root, "migrations/20261029140000_class_types/migration.sql"), "utf8"),
  readFileSync(join(root, "migrations/20261030150000_tariff_billing/migration.sql"), "utf8"),
  readFileSync(join(root, "migrations/20261030170000_weekly_box_hours/migration.sql"), "utf8"),
  readFileSync(join(root, "migrations/20261030180000_shared_class_type_images/migration.sql"), "utf8"),
].join("\n");

describe("migration chain", () => {
  it("applies against Postgres, including recent schema changes and partial unique indexes", async () => {
    const db = new PGlite();
    await db.exec(sql);
    const types = await db.query<{ relname: string }>(
      `SELECT relname FROM pg_class WHERE relname IN ('class_type', 'class_type_image', 'training', 'box_settings') ORDER BY relname`,
    );
    expect(types.rows.map((row) => row.relname)).toEqual([
      "box_settings",
      "class_type",
      "class_type_image",
      "training",
    ]);
    const hoursColumns = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'box_settings' AND column_name IN ('weekly_hours', 'exceptions')
       ORDER BY column_name`,
    );
    expect(hoursColumns.rows.map((row) => row.column_name)).toEqual(["exceptions", "weekly_hours"]);
    const indexes = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE indexname IN (
        'membership_one_current',
        'payment_one_period',
        'class_instance_template_date',
        'booking_one_active'
      ) ORDER BY indexname`,
    );
    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      "booking_one_active",
      "class_instance_template_date",
      "membership_one_current",
      "payment_one_period",
    ]);
    await db.close();
  }, 20_000);
});
