import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { GET, PATCH } from "../../app/api/v1/me/preferences/route";
import { signSessionToken } from "../auth/jwt";
import { hashPassword } from "../auth/password";
import { loginWithPassword } from "../auth/login";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDatabase)("preferencias propias", () => {
  const prisma = new PrismaClient();
  const users: { id: string; token: string; loginId: string }[] = [];
  const context = { params: Promise.resolve({}) };

  beforeAll(async () => {
    const passwordHash = await hashPassword("preferences-test-password");
    for (const role of ["member", "coach", "admin"] as const) {
      const user = await prisma.user.create({ data: {
        loginId: `test-preferences-${randomUUID()}`, passwordHash,
        role, status: "active", firstName: "Test", lastName: "Preferences",
      } });
      users.push({ id: user.id, loginId: user.loginId, token: await signSessionToken({ sub: user.id, role, tv: 0 }) });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    await prisma.$disconnect();
  });

  function request(token?: string, body?: unknown) {
    return new Request("http://localhost/api/v1/me/preferences", {
      method: body === undefined ? "GET" : "PATCH",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  it("empieza siguiendo el sistema para todos los roles y exige sesión", async () => {
    expect((await GET(request(), context)).status).toBe(401);
    expect((await PATCH(request(undefined, { theme: "dark" }), context)).status).toBe(401);
    for (const user of users) {
      expect(await (await GET(request(user.token), context)).json()).toEqual({
        theme: "system",
        preferenceBoxId: null,
      });
    }
  });

  it("guarda el tema de cada rol y lo devuelve al consultar de nuevo", async () => {
    for (const user of users) {
      const response = await PATCH(request(user.token, { theme: "dark" }), context);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ theme: "dark" });
      expect(await (await GET(request(user.token), context)).json()).toMatchObject({ theme: "dark" });
    }
  });

  it("impide cambiar otra cuenta y rechaza preferencias no admitidas", async () => {
    const [member, other] = users;
    const before = await prisma.user.findUniqueOrThrow({ where: { id: other.id } });
    expect((await PATCH(request(member.token, { theme: "light", userId: other.id }), context)).status).toBe(400);
    expect((await PATCH(request(member.token, { theme: "auto" }), context)).status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: other.id } })).theme).toBe(before.theme);
  });

  it("recupera la preferencia guardada al volver a iniciar sesión", async () => {
    const user = users[0];
    await PATCH(request(user.token, { theme: "dark" }), context);
    const result = await loginWithPassword(user.loginId, "preferences-test-password");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.theme).toBe("dark");
  });
});
