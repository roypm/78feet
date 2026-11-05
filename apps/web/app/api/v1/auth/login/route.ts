import { loginRequestSchema } from "@78feet/domain";
import { loginWithPassword } from "@/lib/auth/login";
import { buildSessionCookie } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("FORBIDDEN", 400);
  }

  const parsed = loginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("FORBIDDEN", 400);
  }

  const result = await loginWithPassword(parsed.data.loginId, parsed.data.password);
  if (!result.ok) {
    if (result.locked) {
      return jsonError("ACCOUNT_LOCKED", 403);
    }
    return jsonError("FORBIDDEN", 403, "Usuario o contraseña incorrectos");
  }

  const response = jsonOk({ user: result.user, theme: result.theme });
  response.headers.append("Set-Cookie", buildSessionCookie(result.token));
  return response;
}
