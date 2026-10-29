import { loadActiveUserFromRequest, toSessionUser } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request): Promise<Response> {
  const user = await loadActiveUserFromRequest(request);
  if (!user) {
    return jsonError("FORBIDDEN", 401);
  }
  return jsonOk({ user: toSessionUser(user) });
}
