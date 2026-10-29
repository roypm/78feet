import { DomainError, type ErrorCode } from "@78feet/domain";
import { jsonError } from "../http";

export class BoxError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message?: string) {
    super(message ?? new DomainError(code).message);
    this.name = "BoxError";
    this.status = status;
    this.code = code;
  }
}

const conflictCodes = new Set<ErrorCode>(["FULL", "QUOTA_EXHAUSTED", "OVERLAP", "NO_MEMBERSHIP"]);

export function errorResponse(error: unknown): Response | null {
  if (error instanceof BoxError) {
    return jsonError(error.code, error.status, error.message);
  }
  if (error instanceof DomainError) {
    const status = conflictCodes.has(error.code) ? 409 : 403;
    return jsonError(error.code, status, error.message);
  }
  return null;
}
