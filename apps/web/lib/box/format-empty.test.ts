import { describe, expect, it } from "vitest";
import { EMPTY_FIELD, displayPhone, emptyField } from "./format";

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

describe("displayPhone", () => {
  it("groups a nine-digit mobile", () => {
    expect(displayPhone("666666666")).toBe("666 66 66 66");
    expect(displayPhone("600123123")).toBe("600 12 31 23");
  });

  it("groups with country prefix", () => {
    expect(displayPhone("+34666666666")).toBe("+34 666 66 66 66");
    expect(displayPhone("34666666666")).toBe("+34 666 66 66 66");
  });

  it("reads empty as em dash", () => {
    expect(displayPhone(null)).toBe(EMPTY_FIELD);
  });

  it("leaves unusual lengths as stored", () => {
    expect(displayPhone("900")).toBe("900");
  });
});
