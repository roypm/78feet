import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("clears disposable local references while preserving database images", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE class_type (name text, image_key text);
      CREATE TABLE class_type_image (id text);
      INSERT INTO class_type_image VALUES ('db_current');
      INSERT INTO class_type VALUES ('Local', 'old.png'), ('Current', 'db_current'), ('Missing', NULL);
    `);
    await db.exec(readFileSync(new URL("./migrations/20261112160000_remove_local_class_images/migration.sql", import.meta.url), "utf8"));
    expect((await db.query("SELECT * FROM class_type ORDER BY name")).rows).toEqual([
      { name: "Current", image_key: "db_current" }, { name: "Local", image_key: null },
      { name: "Missing", image_key: null },
    ]);
  } finally { await db.close(); }
}, 20_000);
