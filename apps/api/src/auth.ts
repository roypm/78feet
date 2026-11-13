import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq, sql } from "drizzle-orm";
import {
  DomainError,
  clearExpiredLoginLock,
  loginIsLocked,
  registerLoginFailure,
} from "@78feet/domain";
import { memberAuth, staffAuth } from "@78feet/db/auth-schema";
import { user } from "@78feet/db/schema";
import type { Database, Transaction } from "@78feet/db/connection";
import type { FastifyRequest } from "fastify";

export type AuthSettings = {
  origin: string;
  memberSecret: string;
  staffSecret: string;
  nativeOrigins: string[];
};
export function createAuth(db: Database, settings: AuthSettings) {
  if (
    settings.memberSecret.length < 32 ||
    settings.staffSecret.length < 32 ||
    settings.memberSecret === settings.staffSecret
  )
    throw new Error(
      "Separate Better Auth secrets of at least 32 characters are required",
    );
  function realm(
    name: "member" | "staff",
    database: Database | Transaction = db,
  ) {
    return betterAuth({
      baseURL: settings.origin,
      basePath: `/api/v1/auth/${name}`,
      secret: name === "member" ? settings.memberSecret : settings.staffSecret,
      database: drizzleAdapter(database, {
        provider: "pg",
        schema: name === "member" ? memberAuth : staffAuth,
        transaction: true,
      }),
      emailAndPassword: { enabled: true, requireEmailVerification: false },
      trustedOrigins: [settings.origin, ...settings.nativeOrigins],
      session: {
        expiresIn: 90 * 24 * 3600,
        disableSessionRefresh: true,
        cookieCache: { enabled: false },
      },
      advanced: {
        cookiePrefix: `feet-${name}`,
        useSecureCookies: settings.origin.startsWith("https://"),
        defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      },
      disabledPaths: [
        "/sign-in/email",
        "/sign-up/email",
        "/request-password-reset",
        "/reset-password",
        "/send-verification-email",
        "/verify-email",
        "/change-email",
        "/change-password",
        "/update-user",
        "/delete-user",
      ],
      plugins: [
        username({
          minUsernameLength: 1,
          maxUsernameLength: 256,
          usernameValidator: (value) =>
            value.length > 0 && !value.includes("@"),
        }),
      ],
      logger: { disabled: true },
    });
  }
  const realms = { member: realm("member"), staff: realm("staff") };
  function headers(request: FastifyRequest) {
    const result = new Headers();
    for (const [key, value] of Object.entries(request.headers))
      if (typeof value === "string") result.set(key, value);
    return result;
  }
  async function principal(request: FastifyRequest) {
    const incoming = headers(request);
    const sessions = await Promise.all(
      Object.values(realms).map((auth) =>
        auth.api.getSession({ headers: incoming }),
      ),
    );
    if (sessions.filter(Boolean).length !== 1)
      throw Object.assign(new DomainError("FORBIDDEN"), {
        statusCode: sessions.some(Boolean) ? 403 : 401,
      });
    const realmName = sessions[0] ? "member" : "staff";
    const session = sessions[0] ?? sessions[1]!;
    const [account] = await db
      .select({
        id: user.id,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
        theme: user.theme,
        preferenceBoxId: user.preferenceBoxId,
      })
      .from(user)
      .where(
        sql`${user.authRealm}=${realmName} AND ${user.authUserId}=${session.user.id}`,
      );
    if (!account || account.status !== "active")
      throw Object.assign(new DomainError("FORBIDDEN"), { statusCode: 401 });
    if (!session.user.username)
      throw Object.assign(new DomainError("FORBIDDEN"), { statusCode: 401 });
    return {
      ...account,
      loginId:
        account.role === "member"
          ? session.user.username.toUpperCase()
          : session.user.username,
      realm: realmName,
    };
  }
  async function login(
    access: "member" | "staff",
    loginId: string,
    password: string,
    request: FastifyRequest,
  ) {
    const identifier = loginId.trim().toLowerCase();
    if (identifier.includes("@"))
      throw new DomainError("FORBIDDEN", "Usuario o contraseña incorrectos");
    const result = await db.transaction(async (tx) => {
      const table = access === "member" ? memberAuth.user : staffAuth.user;
      const locked = await tx.execute<{ id: string }>(
        sql`SELECT u.id FROM "user" u JOIN ${table} a ON a.id=u.auth_user_id WHERE u.auth_realm=${access} AND a.username=${identifier} FOR UPDATE OF u`,
      );
      if (!locked.rows[0]) return { error: "FORBIDDEN" as const };
      const [account] = await tx
        .select()
        .from(user)
        .where(eq(user.id, locked.rows[0].id));
      if (account.status !== "active") return { error: "FORBIDDEN" as const };
      const now = new Date();
      const state = clearExpiredLoginLock(account, now);
      if (loginIsLocked(state, now))
        return { error: "ACCOUNT_LOCKED" as const };
      const auth = realm(access, tx);
      let response: Response;
      try {
        response = await auth.api.signInUsername({
          body: { username: identifier, password },
          headers: headers(request),
          asResponse: true,
        });
      } catch (error) {
        if (
          ![401, 403, 422].includes(
            (error as { statusCode?: number }).statusCode ?? 0,
          )
        )
          throw error;
        response = new Response(null, { status: 401 });
      }
      if (!response.ok) {
        const next = registerLoginFailure(state, now);
        await tx
          .update(user)
          .set({ ...next, updatedAt: now })
          .where(eq(user.id, account.id));
        return {
          error: loginIsLocked(next, now)
            ? ("ACCOUNT_LOCKED" as const)
            : ("FORBIDDEN" as const),
        };
      }
      await tx
        .update(user)
        .set({ failedLogins: 0, lockedUntil: null, updatedAt: now })
        .where(eq(user.id, account.id));
      return {
        cookies: response.headers.getSetCookie(),
        user: {
          id: account.id,
          role: account.role,
          firstName: account.firstName,
          lastName: account.lastName,
          loginId: access === "member" ? identifier.toUpperCase() : identifier,
        },
        theme: account.theme,
      };
    });
    if ("error" in result && result.error)
      throw new DomainError(
        result.error,
        result.error === "FORBIDDEN"
          ? "Usuario o contraseña incorrectos"
          : undefined,
      );
    return result;
  }
  async function logout(request: FastifyRequest) {
    const cookies: string[] = [];
    for (const auth of Object.values(realms)) {
      const response = await auth.api.signOut({
        headers: headers(request),
        asResponse: true,
      });
      cookies.push(...response.headers.getSetCookie());
    }
    return cookies;
  }
  return { principal, login, logout };
}
export type Principal = Awaited<
  ReturnType<ReturnType<typeof createAuth>["principal"]>
>;
