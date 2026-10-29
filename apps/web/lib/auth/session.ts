import type { User } from "@prisma/client";
import type { SessionUser } from "@78feet/domain";
import { prisma } from "../db";
import { SESSION_MAX_AGE_SECONDS, verifySessionToken } from "./jwt";

export const SESSION_COOKIE = "session";

export function toSessionUser(user: Pick<User, "id" | "loginId" | "role" | "firstName" | "lastName">): SessionUser {
  return {
    id: user.id,
    loginId: user.loginId,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export function buildSessionCookie(token: string, maxAge = SESSION_MAX_AGE_SECONDS): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function expireSessionCookie(): string {
  return buildSessionCookie("", 0);
}

export function tokenFromRequest(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const bearer = authorization.slice(7).trim();
    if (bearer.length > 0) return bearer;
  }
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  const match = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const value = match.slice(SESSION_COOKIE.length + 1);
  return value.length > 0 ? decodeURIComponent(value) : null;
}

export async function loadActiveUserFromRequest(request: Request): Promise<User | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub } });
  if (!user || user.status !== "active") return null;
  if (user.tokenVersion !== claims.tv) return null;
  return user;
}
