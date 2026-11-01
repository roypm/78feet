import { describe, expect, it } from "vitest";
import { isNavigationActive } from "./navigation";

describe("selección de navegación", () => {
  it("conserva la sección desde la que se abre una clase de staff", () => {
    for (const origin of ["/staff/hoy", "/staff/semana", "/staff/excepciones"]) {
      expect(isNavigationActive("/staff/clases/una-clase", origin, origin)).toBe(true);
      expect(isNavigationActive("/staff/clases/una-clase", "/staff/socios", origin)).toBe(false);
    }
    expect(isNavigationActive("/staff/clases/una-clase", "/staff/excepciones", "/staff/semana")).toBe(false);
  });

  it("usa Semana al entrar directamente a una clase de staff", () => {
    expect(isNavigationActive("/staff/clases/una-clase", "/staff/semana")).toBe(true);
  });

  it("selecciona el calendario del socio en sus detalles de clase", () => {
    expect(isNavigationActive("/clases/una-clase", "/calendario")).toBe(true);
  });

  it("selecciona las fichas anidadas sin confundir prefijos de rutas", () => {
    expect(isNavigationActive("/staff/socios/alguien/pagos", "/staff/socios")).toBe(true);
    expect(isNavigationActive("/staff/socios-extra", "/staff/socios")).toBe(false);
    expect(isNavigationActive("/staff/perfil", "/staff/equipo")).toBe(false);
  });
});
