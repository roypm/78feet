import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { DomainError, resetPasswordSchema, type Role } from "@78feet/domain";
import { memberAuth, staffAuth } from "@78feet/db/auth-schema";
import { membership, user, tariff } from "@78feet/db/schema";
import { lockRows } from "./bookings.ts";
import type { Database } from "@78feet/db/connection";

export type ProvisionAccount = {
  id?: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  loginId: string;
  password: string;
  dni?: string | null;
  phone?: string | null;
  boxId: string;
  tariffId?: string;
};
export async function provisionAccount(
  db: Database,
  input: ProvisionAccount,
  now = new Date(),
) {
  resetPasswordSchema.parse({ password: input.password });
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
    !input.firstName.trim() ||
    !input.lastName.trim()
  )
    throw new DomainError("FORBIDDEN", "Los datos de cuenta no son válidos");
  const realm = input.role === "member" ? "member" : "staff";
  const loginId = input.loginId.trim().toLowerCase();
  if (!loginId || loginId.includes("@") || loginId.length > 256)
    throw new DomainError("FORBIDDEN", "El identificador no es válido");
  const tables = realm === "member" ? memberAuth : staffAuth;
  const password = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    if (realm === "member") {
      const [plan] = input.tariffId
        ? await tx
            .select({ active: tariff.active })
            .from(tariff)
            .where(eq(tariff.id, input.tariffId))
            .for("share")
        : [];
      if (!plan?.active) throw new DomainError("NO_MEMBERSHIP");
    }
    const authId = randomUUID();
    await tx
      .insert(tables.user)
      .values({
        id: authId,
        name: `${input.firstName.trim()} ${input.lastName.trim()}`,
        email: input.email.trim().toLowerCase(),
        emailVerified: false,
        username: loginId,
        displayUsername:
          realm === "member" ? loginId.toUpperCase() : input.loginId.trim(),
        createdAt: now,
        updatedAt: now,
      });
    await tx
      .insert(tables.account)
      .values({
        id: randomUUID(),
        userId: authId,
        accountId: authId,
        providerId: "credential",
        password,
        createdAt: now,
        updatedAt: now,
      });
    const [created] = await tx
      .insert(user)
      .values({
        id: input.id,
        authRealm: realm,
        authUserId: authId,
        role: input.role,
        status: "active",
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        dni:
          input.dni?.trim().toUpperCase() ??
          (realm === "member" ? loginId.toUpperCase() : null),
        phone: input.phone,
        paymentBoxId: realm === "member" ? input.boxId : null,
        preferenceBoxId: input.boxId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: user.id, role: user.role });
    if (realm === "member") {
      if (!input.tariffId) throw new DomainError("NO_MEMBERSHIP");
      // FK failure rolls back business user, auth user and credential together.
      await tx
        .insert(membership)
        .values({
          userId: created.id,
          tariffId: input.tariffId,
          startedAt: now,
        });
    }
    return created;
  });
}

export async function resetAccountPassword(
  db: Database,
  id: string,
  password: string,
  now = new Date(),
) {
  resetPasswordSchema.parse({ password });
  const hashed = await hashPassword(password);
  return db.transaction(async (tx) => {
    await lockRows(tx, [], [id]);
    const [account] = await tx
      .select({ authRealm: user.authRealm, authUserId: user.authUserId })
      .from(user)
      .where(eq(user.id, id));
    if (!account) throw new DomainError("FORBIDDEN");
    const tables = account.authRealm === "member" ? memberAuth : staffAuth;
    await tx
      .update(tables.account)
      .set({ password: hashed, updatedAt: now })
      .where(eq(tables.account.userId, account.authUserId));
    await tx
      .delete(tables.session)
      .where(eq(tables.session.userId, account.authUserId));
    await tx
      .update(user)
      .set({ failedLogins: 0, lockedUntil: null, updatedAt: now })
      .where(eq(user.id, id));
    return { ok: true };
  });
}
