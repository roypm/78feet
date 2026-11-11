import { describe, expect, it } from "vitest";
import { tokenFromRequest } from "./session";

describe("cookie de sesión", () => {
  it.each(["%", "%GG", "%E0%A4%A"])("rechaza la codificación inválida %s", (value) => {
    expect(tokenFromRequest(new Request("http://localhost", { headers: { cookie: `session=${value}` } }))).toBeNull();
  });
  it("conserva tokens válidos y la prioridad de bearer", () => {
    expect(tokenFromRequest(new Request("http://localhost", { headers: { cookie: "session=abc%2Edef" } }))).toBe(
      "abc.def",
    );
    expect(
      tokenFromRequest(
        new Request("http://localhost", { headers: { cookie: "session=%", authorization: "Bearer token" } }),
      ),
    ).toBe("token");
  });
});
