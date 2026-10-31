import { describe, expect, it } from "vitest";
import { formatEuroCents, parseEuroCents, parseQuantity } from "./numbers";

describe("quantities", () => {
  it("accepts zero and whole counts without losing integer precision", () => {
    expect(parseQuantity("0")).toBe(0);
    expect(parseQuantity(" 0012 ")).toBe(12);
    expect(parseQuantity(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("keeps empty and invalid values distinct from zero", () => {
    for (const text of ["", " ", "-1", "1.5", "1,5", "1e3", "12abc", "NaN", "Infinity", "1 000", "9007199254740992"]) {
      expect(parseQuantity(text)).toBeNull();
    }
  });
});

describe("euro amounts", () => {
  it("accepts comma or dot and converts exactly to cents", () => {
    for (const [text, cents] of [["0", 0], ["0,00", 0], ["0.01", 1], ["19,99", 1999], ["19.99", 1999], [",5", 50], [".5", 50], ["12,", 1200], [" 0007,1 ", 710], ["1.01", 101], ["90071992547409.91", Number.MAX_SAFE_INTEGER]] as const) {
      expect(parseEuroCents(text)).toBe(cents);
      expect(parseEuroCents(formatEuroCents(cents))).toBe(cents);
      expect(parseEuroCents(formatEuroCents(cents, "."))).toBe(cents);
    }
    expect(formatEuroCents(1999)).toBe("19,99");
    expect(formatEuroCents(0, ".")).toBe("0.00");
  });

  it("rejects extra precision, ambiguous grouping and unsafe amounts rather than rounding", () => {
    for (const text of ["", " ", ".", ",", "-0.01", "19.999", "0,001", "1.234,56", "1,234.56", "1 234,56", "1e2", "12abc", "NaN", "Infinity", "90071992547409.92"]) {
      expect(parseEuroCents(text)).toBeNull();
    }
  });
});
