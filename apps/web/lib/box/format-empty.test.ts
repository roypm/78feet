import { describe, expect, it } from "vitest";
import { EMPTY_FIELD, emptyField } from "./format";

describe("emptyField", () => {
  it("reads blank contact fields as an em dash", () => {
    expect(emptyField(null)).toBe(EMPTY_FIELD);
    expect(emptyField(undefined)).toBe(EMPTY_FIELD);
    expect(emptyField("")).toBe(EMPTY_FIELD);
    expect(emptyField("   ")).toBe(EMPTY_FIELD);
  });

  it("keeps a real value", () => {
    expect(emptyField("600 000 000")).toBe("600 000 000");
    expect(emptyField("  ana@box.test  ")).toBe("ana@box.test");
  });
});
