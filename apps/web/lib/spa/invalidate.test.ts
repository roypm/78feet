import { describe, expect, it } from "vitest";
import { invalidationScopes } from "./query";

describe("invalidación de la SPA", () => {
  it("reserva, tarifa, pago y plantilla cubren las lecturas que cambian", () => {
    expect(invalidationScopes.booking).toEqual(
      expect.arrayContaining(["calendar", "instance", "bookings", "summary"]),
    );
    expect(invalidationScopes.tariff).toEqual(
      expect.arrayContaining(["member", "bookings", "summary", "history"]),
    );
    expect(invalidationScopes.payment).toEqual(
      expect.arrayContaining(["payments", "unpaid", "summary"]),
    );
    expect(invalidationScopes.template).toEqual(
      expect.arrayContaining(["templates", "calendar", "bookings"]),
    );
  });
});
