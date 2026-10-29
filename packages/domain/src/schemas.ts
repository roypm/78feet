import { z } from "zod";
import { ERROR_CODES } from "./errors";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha inválida");

export const roleSchema = z.enum(["member", "coach", "admin"]);
export const userStatusSchema = z.enum(["active", "inactive"]);
export const tariffKindSchema = z.enum(["monthly", "pack"]);
export const classKindSchema = z.enum(["directed", "open"]);
export const instanceStatusSchema = z.enum(["scheduled", "cancelled"]);
export const bookingPoolSchema = z.enum(["weekly_directed", "weekly_open", "pack"]);
export const bookingStatusSchema = z.enum(["active", "cancelled"]);
export const errorCodeSchema = z.enum(ERROR_CODES);

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
});

export const loginRequestSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  loginId: z.string(),
  role: roleSchema,
  firstName: z.string(),
  lastName: z.string(),
});

export const loginResponseSchema = z.object({
  token: z.string(),
  user: sessionUserSchema,
});

export const meResponseSchema = z.object({
  user: sessionUserSchema,
});

export const calendarQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});

export const createBookingRequestSchema = z.object({
  instanceId: z.string().uuid(),
});

export const cancelAdminBookingQuerySchema = z.object({
  returnQuota: z.enum(["true", "false"]).optional(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
