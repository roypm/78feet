import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { createWithSlug, slugBase } from "./slugs";
import { resolveFilter } from "./filter-url";

describe("readable filters", () => {
  const items = [{ id: "legacy-id", slug: "sant-cugat" }];
  it("accepts only current slugs and ignores UUID and unknown filters", () => {
    expect(resolveFilter(items, "legacy-id")).toBeUndefined();
    expect(resolveFilter(items, "sant-cugat")).toBe(items[0]);
    expect(resolveFilter(items, "unknown")).toBeUndefined();
  });
  it("normalises accents and punctuation and handles names without Latin letters", () => {
    expect(slugBase("  Box Sant Cugat del Vallès! ")).toBe("box-sant-cugat-del-valles");
    expect(slugBase("王秀英")).toBe("item");
    expect(slugBase("a".repeat(120))).toHaveLength(80);
  });
  it("reserves Todos and retries collisions using the unique constraint", async () => {
    const attempted: string[] = [];
    const result = await createWithSlug("Todos", async (slug) => {
      attempted.push(slug);
      if (slug === "todos-2") throw new Prisma.PrismaClientKnownRequestError("collision", {
        code: "P2002", clientVersion: "test", meta: { target: ["slug"] },
      });
      return slug;
    });
    expect(result).toBe("todos-3");
    expect(attempted).toEqual(["todos-2", "todos-3"]);
  });
  it("preserves unrelated errors, including duplicate box names", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("duplicate name", {
      code: "P2002", clientVersion: "test", meta: { target: ["name"] },
    });
    await expect(createWithSlug("Box", async () => { throw error; })).rejects.toBe(error);
  });
});
