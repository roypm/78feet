import { DomainError, apiErrorBody, type ErrorCode } from "@78feet/domain";

export class BoxError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? new DomainError(code).message);
    this.name = "BoxError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const conflictCodes = new Set<ErrorCode>([
  "FULL",
  "QUOTA_EXHAUSTED",
  "OVERLAP",
  "NO_MEMBERSHIP",
  "CLASS_TYPE_IN_USE",
  "CONFIRM_REQUIRED",
  "SCHEDULE_CLOSED",
]);

export function errorResponse(error: unknown): Response | null {
  if (error instanceof BoxError) {
    return Response.json(
      apiErrorBody(new DomainError(error.code, error.message, error.details)),
      { status: error.status },
    );
  }
  if (error instanceof DomainError) {
    const status = conflictCodes.has(error.code) ? 409 : 403;
    return Response.json(apiErrorBody(error), { status });
  }
  return null;
}
