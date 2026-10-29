import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";

const TOKEN_TTL = "90d";
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

export type SessionClaims = {
  sub: string;
  role: Role;
  tv: number;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }
  return new TextEncoder().encode(secret);
}

export function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, tv: claims.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return parseClaims(payload);
  } catch {
    return null;
  }
}

function parseClaims(payload: JWTPayload): SessionClaims | null {
  if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
  if (payload.role !== "member" && payload.role !== "coach" && payload.role !== "admin") {
    return null;
  }
  if (typeof payload.tv !== "number" || !Number.isInteger(payload.tv)) return null;
  return { sub: payload.sub, role: payload.role, tv: payload.tv };
}
