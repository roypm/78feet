import { describe, expect, it } from "vitest";
import { constraintMessageFromValidity, REQUIRED_FIELD_MESSAGE } from "./field-validity";

function validity(overrides: Partial<Parameters<typeof constraintMessageFromValidity>[0]> = {}) {
  return {
    valid: false,
    valueMissing: false,
    typeMismatch: false,
    tooShort: false,
    tooLong: false,
    patternMismatch: false,
    badInput: false,
    ...overrides,
  };
}

describe("constraintMessageFromValidity", () => {
  it("returns nothing when the control is valid", () => {
    expect(constraintMessageFromValidity(validity({ valid: true }))).toBe("");
  });

  it("uses the shared required copy instead of the browser balloon", () => {
    expect(constraintMessageFromValidity(validity({ valueMissing: true }))).toBe(REQUIRED_FIELD_MESSAGE);
  });

  it("describes an invalid email and a short password", () => {
    expect(constraintMessageFromValidity(validity({ typeMismatch: true }), { type: "email" })).toBe(
      "Escribí un correo válido.",
    );
    expect(constraintMessageFromValidity(validity({ tooShort: true }), { minLength: 8 })).toBe(
      "Mínimo 8 caracteres.",
    );
  });

  it("does not reuse the browser's native validationMessage", () => {
    expect(constraintMessageFromValidity(validity({ patternMismatch: true }))).toBe("Este valor no es válido.");
    expect(constraintMessageFromValidity(validity({ typeMismatch: true }), { type: "url" })).toBe(
      "Este valor no es válido.",
    );
  });
});
