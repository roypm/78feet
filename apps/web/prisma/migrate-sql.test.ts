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
  it("añade el modo sistema sin cambiar la apariencia de las cuentas existentes", async () => {
    const db = new PGlite();
    try {
      await db.exec(sql);
      await db.exec(`INSERT INTO "user" (id, login_id, password_hash, role, status, first_name, last_name, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000001', 'existing-user', 'test-hash', 'admin', 'active', 'Existing', 'Admin', NOW())`);
      await db.exec(readFileSync(join(root, "migrations/20261101193000_user_theme/migration.sql"), "utf8"));
      await db.exec(readFileSync(join(root, "migrations/20261101200000_user_theme_system_value/migration.sql"), "utf8"));
      await db.exec(readFileSync(join(root, "migrations/20261101200100_user_theme_system_default/migration.sql"), "utf8"));
      expect((await db.query(`SELECT login_id, first_name, theme FROM "user"`)).rows).toEqual([
        { login_id: "existing-user", first_name: "Existing", theme: "light" },
      ]);
      await db.exec(`UPDATE "user" SET theme = 'dark'`);
      expect((await db.query(`SELECT theme FROM "user"`)).rows).toEqual([{ theme: "dark" }]);
      await db.exec(`UPDATE "user" SET theme = 'system'`);
      expect((await db.query(`SELECT theme FROM "user"`)).rows).toEqual([{ theme: "system" }]);
    } finally {
      await db.close();
    }
  }, 20_000);

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

  it("turns the single schedule into Box 1 and keeps templates and classes on it", async () => {
    const db = new PGlite();
    try {
      await db.exec(sql);
      await db.exec(`
        INSERT INTO "class_type" ("id", "name", "kind", "image_key")
        VALUES ('11111111-1111-4111-8111-111111111111', 'WOD', 'directed', 'placeholder.png');
        INSERT INTO "class_template" ("id", "weekday", "start_time", "end_time", "class_type_id", "default_capacity")
        VALUES ('22222222-2222-4222-8222-222222222222', 1, TIME '18:00', TIME '19:00', '11111111-1111-4111-8111-111111111111', 12);
        INSERT INTO "class_instance" ("id", "template_id", "date", "start_at", "end_at", "class_type_id", "kind", "capacity", "status")
        VALUES (
          '33333333-3333-4333-8333-333333333333',
          '22222222-2222-4222-8222-222222222222',
          DATE '2026-11-02',
          TIMESTAMPTZ '2026-11-02 17:00:00+00',
          TIMESTAMPTZ '2026-11-02 18:00:00+00',
          '11111111-1111-4111-8111-111111111111',
          'directed',
          12,
          'scheduled'
        );
      `);
      await db.exec(readFileSync(join(root, "migrations/20261104150000_box/migration.sql"), "utf8"));
      const boxes = await db.query<{ name: string; open_time: string }>(`
        SELECT "name", "weekly_hours"->0->'intervals'->0->>'openTime' AS open_time FROM "box"
      `);
      expect(boxes.rows).toEqual([{ name: "Box 1", open_time: "07:00" }]);
      const gone = await db.query<{ relname: string }>(
        `SELECT relname FROM pg_class WHERE relname = 'box_settings'`,
      );
      expect(gone.rows).toEqual([]);
      const owners = await db.query<{ template_box: string; instance_box: string }>(`
        SELECT t."box_id"::text AS template_box, i."box_id"::text AS instance_box
        FROM "class_template" AS t
        JOIN "class_instance" AS i ON i."template_id" = t."id"
      `);
      expect(owners.rows).toHaveLength(1);
      expect(owners.rows[0]?.template_box).toBe(owners.rows[0]?.instance_box);
      const untouched = await db.query<{ name: string }>(`SELECT "name" FROM "class_type"`);
      expect(untouched.rows).toEqual([{ name: "WOD" }]);
    } finally {
      await db.close();
    }
  }, 20_000);

  it("assigns existing members to Box 1 as payment and preference", async () => {
    const db = new PGlite();
    try {
      await db.exec(sql);
      await db.exec(readFileSync(join(root, "migrations/20261104150000_box/migration.sql"), "utf8"));
      await db.exec(`
        INSERT INTO "user" (id, login_id, password_hash, role, status, first_name, last_name, updated_at)
        VALUES
          ('44444444-4444-4444-8444-444444444444', 'socio', 'hash', 'member', 'active', 'Marta', 'García', NOW()),
          ('55555555-5555-4555-8555-555555555555', 'coach', 'hash', 'coach', 'active', 'Ciro', 'Coach', NOW());
      `);
      await db.exec(readFileSync(join(root, "migrations/20261104160000_member_boxes/migration.sql"), "utf8"));
      const rows = await db.query<{ login_id: string; payment: string | null; preference: string | null }>(`
        SELECT u.login_id, u.payment_box_id::text AS payment, u.preference_box_id::text AS preference
        FROM "user" AS u
        ORDER BY u.login_id
      `);
      const box = await db.query<{ id: string }>(`SELECT id::text AS id FROM "box"`);
      expect(rows.rows).toEqual([
        { login_id: "coach", payment: null, preference: null },
        { login_id: "socio", payment: box.rows[0]?.id, preference: box.rows[0]?.id },
      ]);
    } finally {
      await db.close();
    }
  }, 20_000);
});
