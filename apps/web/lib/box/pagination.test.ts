import { describe, expect, it, vi } from "vitest";
import { pageNumber, paginate } from "./pagination";

describe("pagination", () => {
  it("normalizes malformed page numbers without allowing unsafe offsets", () => {
    for (const value of [undefined, "", "-2", "1.5", "Infinity", "9007199254740992", "0", "abc"]) {
      expect(pageNumber(value)).toBe(1);
    }
    expect(pageNumber("3")).toBe(3);
  });
  it("clamps removed pages to the last available page", async () => {
    const load = vi.fn(async () => ["last row"]);
    const result = await paginate(51, 99, load);
    expect(load).toHaveBeenCalledWith({ skip: 50, take: 25 });
    expect(result.items).toEqual(["last row"]);
    expect(result.pageInfo).toEqual({ page: 3, pageSize: 25, total: 51, totalPages: 3 });
  });
  it("does not fetch rows for an empty list", async () => {
    const load = vi.fn(async () => []);
    const result = await paginate(0, 9, load);
    expect(load).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.pageInfo.page).toBe(1);
  });
});
