import { expireSessionCookie } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http";

export async function POST(): Promise<Response> {
  const response = jsonOk({ ok: true });
  response.headers.append("Set-Cookie", expireSessionCookie());
  return response;
}
