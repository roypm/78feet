import { describe, expect, it } from "vitest";
import { resolveFilter } from "./filter-url";
describe("readable filters", () => {
  it("accepts current slugs and ignores UUID and unknown filters", () => {
    const items = [{ id: "old-id", slug: "sant-cugat" }];
    expect(resolveFilter(items, "old-id")).toBeUndefined();
    expect(resolveFilter(items, "sant-cugat")).toBe(items[0]);
    expect(resolveFilter(items, "unknown")).toBeUndefined();
  });
});
