import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("backfills both catalogues with unique readable slugs that survive renames", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE box (id uuid PRIMARY KEY, name text);
      CREATE TABLE class_type (id uuid PRIMARY KEY, name text);
      INSERT INTO box VALUES ('11111111-1111-4111-8111-111111111111', 'Box 1');
      INSERT INTO class_type VALUES
        ('11111111-1111-4111-8111-111111111111', 'Técnica'),
        ('22222222-2222-4222-8222-222222222222', 'Tecnica'),
        ('33333333-3333-4333-8333-333333333333', 'Tecnica-2'),
        ('44444444-4444-4444-8444-444444444444', 'Todos'),
        ('55555555-5555-4555-8555-555555555555', '王秀英');
    `);
    await db.exec(readFileSync(new URL("./migrations/20261112150000_readable_filter_slugs/migration.sql", import.meta.url), "utf8"));
    const result = await db.query<{ slug: string }>("SELECT slug FROM class_type ORDER BY id");
    expect(result.rows.map((row) => row.slug)).toEqual(["tecnica", "tecnica-2", "tecnica-2-2", "todos-2", "item"]);
    await db.exec("UPDATE box SET name = 'Otra sede'");
    expect((await db.query<{ slug: string }>("SELECT slug FROM box")).rows).toEqual([{ slug: "box-1" }]);
    await expect(db.exec("INSERT INTO box VALUES ('22222222-2222-4222-8222-222222222222', 'Otra', 'box-1')"))
      .rejects.toThrow();
  } finally { await db.close(); }
}, 20_000);
