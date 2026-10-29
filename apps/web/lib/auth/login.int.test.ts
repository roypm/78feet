import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { loginWithPassword } from "./login";

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDatabase)("loginWithPassword", () => {
  const prisma = new PrismaClient();
  const loginId = `test-${randomUUID()}`;
  let userId = "";

  it("signs in an active admin and resets the lock counters", async () => {
    const user = await prisma.user.create({
      data: {
        loginId,
        passwordHash: await argon2.hash("secret-pass", { type: argon2.argon2id }),
        role: "admin",
        status: "active",
        firstName: "Test",
        lastName: "Admin",
        failedLogins: 3,
      },
    });
    userId = user.id;

    const result = await loginWithPassword(loginId, "secret-pass");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.loginId).toBe(loginId);
      expect(result.token.length).toBeGreaterThan(10);
    }

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(stored.failedLogins).toBe(0);
    expect(stored.lockedUntil).toBeNull();
  });

  it("rejects a wrong password without revealing the account", async () => {
    const result = await loginWithPassword(loginId, "wrong");
    expect(result).toEqual({ ok: false, locked: false });
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });
});
