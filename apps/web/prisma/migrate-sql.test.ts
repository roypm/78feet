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
].join("\n");

describe("init migration", () => {
  it("applies against Postgres, including partial unique indexes", async () => {
    const db = new PGlite();
    await db.exec(sql);
    const types = await db.query<{ relname: string }>(
      `SELECT relname FROM pg_class WHERE relname IN ('class_type', 'training', 'box_settings') ORDER BY relname`,
    );
    expect(types.rows.map((row) => row.relname)).toEqual(["box_settings", "class_type", "training"]);
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
