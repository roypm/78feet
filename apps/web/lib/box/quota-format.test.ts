import { describe, expect, it } from "vitest";
import { formatAvailableQuota } from "./format";
import { PAYMENT_METHODS, paymentMethodLabel } from "./payments-view";

describe("formato compartido de consumo", () => {
  it.each([
    [0, 0, 0, "0 clases disponibles"],
    [0, 1, 0, "1 de 1 clase disponible"],
    [1, 2, 0, "1 de 2 clases disponible"],
    [3, 2, 0, "0 de 2 clases disponibles"],
    [1, 2, 2, "3 de 4 clases disponibles"],
    [0, 2, -3, "0 clases disponibles"],
    [3, null, 0, "3/Ilimitadas"],
  ] as const)("usadas %s, límite %s, ajuste %s", (used, limit, adjustment, expected) => {
    expect(formatAvailableQuota(used, limit, adjustment)).toBe(expected);
  });
});

describe("métodos de pago", () => {
  it("usa las mismas etiquetas en los formularios y las lecturas", () => {
    for (const method of PAYMENT_METHODS) expect(paymentMethodLabel(method.value)).toBe(method.label);
    expect(paymentMethodLabel(null)).toBe("—");
    expect(paymentMethodLabel("legacy")).toBe("legacy");
  });
});
