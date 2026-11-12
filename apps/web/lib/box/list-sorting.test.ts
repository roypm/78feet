import { describe, expect, it } from "vitest";
import { PERSON_SORTS, TRAINING_SORTS, PAYMENT_SORTS, TEAM_SORTS, selectedSort,
  listOptionsHref, personOrder, trainingOrder, paymentOrder } from "./list-sorting";

describe("list options", () => {
  it("applies all filters and sorting together without carrying a previous page", () => {
    expect(listOptionsHref("/staff/equipo", { rol: "coach", estado: "baja" }, "nombre-desc", "rol"))
      .toBe("/staff/equipo?rol=coach&estado=baja&orden=nombre-desc");
    expect(listOptionsHref("/staff/biblioteca", { tipo: "fuerza-movilidad" }, "nombre-asc", "recientes"))
      .toBe("/staff/biblioteca?tipo=fuerza-movilidad&orden=nombre-asc");
  });
  it("resets to the base URL and omits default values", () => {
    expect(listOptionsHref("/staff/socios", { estado: "todos" }, "apellidos-asc", "apellidos-asc"))
      .toBe("/staff/socios");
  });
  it("rejects unknown sort values for every module", () => {
    for (const options of [PERSON_SORTS, TRAINING_SORTS, PAYMENT_SORTS, TEAM_SORTS]) {
      expect(selectedSort(options, "passwordHash")).toBe(options[0].value);
      expect(selectedSort(options, undefined)).toBe(options[0].value);
    }
  });
  it("uses stable tie breakers in both directions", () => {
    expect(personOrder("nombre-desc")).toEqual([{ firstName: "desc" }, { lastName: "desc" }, { id: "asc" }]);
    expect(personOrder("apellidos-asc")[0]).toEqual({ lastName: "asc" });
    expect(trainingOrder("antiguos")).toEqual([{ updatedAt: "asc" }, { id: "asc" }]);
    expect(paymentOrder("importe-desc")).toEqual([{ amountCents: "desc" }, { createdAt: "desc" }, { id: "desc" }]);
  });
});
