import { DomainError, apiErrorBody, type ErrorCode } from "@78feet/domain";

export function jsonError(
  code: ErrorCode,
  status: number,
  message?: string,
  details?: Record<string, unknown>,
): Response {
  const error = new DomainError(code, message, details);
  return Response.json(apiErrorBody(error), { status });
}

export function jsonOk(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
