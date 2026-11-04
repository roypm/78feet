import { atBoxTime } from "@78feet/domain";
import { describe, expect, it } from "vitest";
import { parseStaffClassOrigin, staffClassOriginBack } from "./staff-nav";

describe("origen de una clase de staff", () => {
  it("lee Hoy y Excepciones; el resto (incluida la entrada directa) es Semana", () => {
    expect(parseStaffClassOrigin("hoy")).toBe("hoy");
    expect(parseStaffClassOrigin("excepciones")).toBe("excepciones");
    expect(parseStaffClassOrigin("semana")).toBe("semana");
    expect(parseStaffClassOrigin(undefined)).toBe("semana");
    expect(parseStaffClassOrigin("otra")).toBe("semana");
  });

  it("vuelve al listado de esa sección", () => {
    expect(staffClassOriginBack("hoy", "2026-11-04")).toEqual({ href: "/staff/hoy", label: "Hoy" });
    expect(staffClassOriginBack("excepciones", "2026-12-01")).toEqual({
      href: "/staff/excepciones",
      label: "Excepciones",
    });
  });

  it("en Semana conserva la semana de la clase si no es la actual", () => {
    const now = atBoxTime("2026-11-04", "12:00");
    expect(staffClassOriginBack("semana", "2026-11-04", now)).toEqual({
      href: "/staff/semana",
      label: "Semana",
    });
    expect(staffClassOriginBack("semana", "2026-11-11", now).label).toBe("Semana");
    expect(staffClassOriginBack("semana", "2026-11-11", now).href).toBe("/staff/semana?semana=2026-11-09");
  });
});
