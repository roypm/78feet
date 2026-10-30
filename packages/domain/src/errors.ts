export const ERROR_CODES = [
  "FULL",
  "QUOTA_EXHAUSTED",
  "OVERLAP",
  "CANCELLATION_CLOSED",
  "NO_MEMBERSHIP",
  "FORBIDDEN",
  "CLASS_TYPE_IN_USE",
  "CONFIRM_REQUIRED",
  "SCHEDULE_CLOSED",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorMessages: Record<ErrorCode, string> = {
  FULL: "Clase completa",
  QUOTA_EXHAUSTED: "Sin cupo disponible",
  OVERLAP: "Ya tenés otra reserva a esa hora",
  CANCELLATION_CLOSED: "Cancelación cerrada",
  NO_MEMBERSHIP: "Sin membresía activa",
  FORBIDDEN: "No permitido",
  CLASS_TYPE_IN_USE: "Ese tipo todavía se usa",
  CONFIRM_REQUIRED: "Hay que confirmar el cambio",
  SCHEDULE_CLOSED: "El box está cerrado en ese horario",
};

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message: string = errorMessages[code], details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

export function apiErrorBody(error: DomainError): {
  error: { code: ErrorCode; message: string };
  detachCount?: number;
} {
  const body: { error: { code: ErrorCode; message: string }; detachCount?: number } = {
    error: { code: error.code, message: error.message },
  };
  const detachCount = error.details?.detachCount;
  if (typeof detachCount === "number") body.detachCount = detachCount;
  return body;
}
