import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { POST as loginRoute } from "../../app/api/v1/auth/login/route";
import { GET as healthRoute } from "../../app/api/v1/health/route";
import { GET as meRoute } from "../../app/api/v1/auth/me/route";
import { callRoute } from "../test/call-route";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDatabase)("HTTP route smoke", () => {
  const prisma = new PrismaClient();
  const loginId = `lock-${randomUUID()}`;
  let userId = "";

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("returns health without auth", async () => {
    const raw = await healthRoute();
    expect(raw.status).toBe(200);
  });

  it("rejects /auth/me without a session", async () => {
    const me = await callRoute(meRoute, "GET", "/api/v1/auth/me");
    expect(me.status).toBe(401);
  });

  it("returns ACCOUNT_LOCKED when the account is locked", async () => {
    const lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        loginId,
        passwordHash: await argon2.hash("secret-pass", { type: argon2.argon2id }),
        role: "member",
        status: "active",
        firstName: "Lock",
        lastName: "Test",
        failedLogins: 5,
        lockedUntil,
      },
    });
    userId = user.id;

    const response = await callRoute(loginRoute, "POST", "/api/v1/auth/login", {
      body: { loginId, password: "secret-pass" },
    });
    expect(response.status).toBe(403);
    expect(response.json).toMatchObject({ error: { code: "ACCOUNT_LOCKED" } });
  });

  it("returns a generic forbidden message on wrong password", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLogins: 0, lockedUntil: null },
    });
    const response = await callRoute(loginRoute, "POST", "/api/v1/auth/login", {
      body: { loginId, password: "wrong-password" },
    });
    expect(response.status).toBe(403);
    expect(response.json).toMatchObject({
      error: { code: "FORBIDDEN", message: "Usuario o contraseña incorrectos" },
    });
  });
});
