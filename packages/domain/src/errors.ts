export const ERROR_CODES = [
  "FULL",
  "QUOTA_EXHAUSTED",
  "OVERLAP",
  "CANCELLATION_CLOSED",
  "NO_MEMBERSHIP",
  "FORBIDDEN",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorMessages: Record<ErrorCode, string> = {
  FULL: "Clase completa",
  QUOTA_EXHAUSTED: "Sin cupo disponible",
  OVERLAP: "Ya tenés otra reserva a esa hora",
  CANCELLATION_CLOSED: "Cancelación cerrada",
  NO_MEMBERSHIP: "Sin membresía activa",
  FORBIDDEN: "No permitido",
};

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string = errorMessages[code]) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export function apiErrorBody(error: DomainError): {
  error: { code: ErrorCode; message: string };
} {
  return { error: { code: error.code, message: error.message } };
}
