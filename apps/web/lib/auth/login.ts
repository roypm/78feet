import {
  clearExpiredLoginLock,
  loginIsLocked,
  registerLoginFailure,
  registerLoginSuccess,
} from "@78feet/domain";
import { prisma } from "../db";
import { signSessionToken } from "./jwt";
import { verifyPassword } from "./password";
import { toSessionUser } from "./session";

export type LoginResult =
  | { ok: true; token: string; user: ReturnType<typeof toSessionUser> }
  | { ok: false; locked: boolean };

export async function loginWithPassword(loginId: string, password: string): Promise<LoginResult> {
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || user.status !== "active") {
    return { ok: false, locked: false };
  }

  const current = clearExpiredLoginLock(
    { failedLogins: user.failedLogins, lockedUntil: user.lockedUntil },
    now,
  );
  if (loginIsLocked(current, now)) {
    return { ok: false, locked: true };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const next = registerLoginFailure(current, now);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: next.failedLogins,
        lockedUntil: next.lockedUntil,
      },
    });
    return { ok: false, locked: loginIsLocked(next, now) };
  }

  const cleared = registerLoginSuccess();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLogins: cleared.failedLogins,
      lockedUntil: cleared.lockedUntil,
    },
  });

  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion,
  });
  return { ok: true, token, user: toSessionUser(user) };
}
