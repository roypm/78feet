import type { Role, User } from "@prisma/client";
import { jsonError } from "../http";
import { loadActiveUserFromRequest } from "../auth/session";
import { BoxError, errorResponse } from "./errors";

export async function readBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BoxError(400, "FORBIDDEN", "El cuerpo no es JSON");
  }
}

export function sessionHandler(
  roles: readonly Role[],
  run: (user: User, request: Request, params: Record<string, string>) => Promise<unknown>,
  successStatus = 200,
) {
  return async (
    request: Request,
    context?: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    const user = await loadActiveUserFromRequest(request);
    if (!user) return jsonError("FORBIDDEN", 401, "Tenés que entrar");
    if (!roles.includes(user.role)) return jsonError("FORBIDDEN", 403);
    try {
      const params = context ? await context.params : {};
      return Response.json(await run(user, request, params), { status: successStatus });
    } catch (error) {
      const response = errorResponse(error);
      if (response) return response;
      throw error;
    }
  };
}

export const staffHandler = sessionHandler;
