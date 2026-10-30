import { z } from "zod";
import { ERROR_CODES } from "./errors";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "fecha inválida");

export const roleSchema = z.enum(["member", "coach", "admin"]);
export const userStatusSchema = z.enum(["active", "inactive"]);
export const tariffConsumptionSchema = z.enum(["weekly_quota", "monthly_quota", "pack"]);
export const tariffBillingSchema = z.enum([
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "none",
  "one_time",
]);
export const paymentBillingSchema = z.enum(["monthly", "quarterly", "semiannual", "annual", "one_time"]);
/** @deprecated */
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

export const createAdminBookingRequestSchema = z.object({
  instanceId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const cancelAdminBookingQuerySchema = z.object({
  returnQuota: z.enum(["true", "false"]).optional(),
});

const clockSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(?::\d{2})?$/, "Hora inválida")
  .refine((value) => {
    const [hour, minute, second = 0] = value.split(":").map(Number);
    return hour! < 24 && minute! < 60 && second! < 60;
  }, "Hora inválida");

function usesPeriodicQuota(consumption: z.infer<typeof tariffConsumptionSchema>): boolean {
  return consumption === "weekly_quota" || consumption === "monthly_quota";
}

export const tariffWriteSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio"),
    consumptionModel: tariffConsumptionSchema,
    billingPeriod: tariffBillingSchema,
    priceCents: z.number().int().min(0, "El precio no puede ser negativo"),
    weeklyDirected: z.number().int().min(0).optional(),
    weeklyOpen: z.number().int().min(0).optional(),
    packClasses: z.number().int().positive().nullable().optional(),
    active: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const weeklyDirected = value.weeklyDirected ?? 0;
    const weeklyOpen = value.weeklyOpen ?? 0;
    const packClasses = value.packClasses ?? null;
    if (usesPeriodicQuota(value.consumptionModel) && packClasses !== null) {
      ctx.addIssue({
        code: "custom",
        message: "El cupo por periodo no lleva tamaño de bono",
        path: ["packClasses"],
      });
    }
    if (value.consumptionModel === "pack" && packClasses === null) {
      ctx.addIssue({
        code: "custom",
        message: "Un bono necesita cuántas clases incluye",
        path: ["packClasses"],
      });
    }
    if (value.consumptionModel === "pack" && (weeklyDirected !== 0 || weeklyOpen !== 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Un bono no tiene cupo semanal",
        path: ["weeklyDirected"],
      });
    }
    if (value.consumptionModel === "pack" && value.billingPeriod !== "one_time") {
      ctx.addIssue({
        code: "custom",
        message: "Un bono se factura como pago único",
        path: ["billingPeriod"],
      });
    }
    if (usesPeriodicQuota(value.consumptionModel) && value.billingPeriod === "one_time") {
      ctx.addIssue({
        code: "custom",
        message: "El cupo por periodo no usa pago único",
        path: ["billingPeriod"],
      });
    }
  })
  .transform((value) => ({
    name: value.name,
    consumptionModel: value.consumptionModel,
    billingPeriod: value.billingPeriod,
    priceCents: value.priceCents,
    weeklyDirected: usesPeriodicQuota(value.consumptionModel) ? (value.weeklyDirected ?? 0) : 0,
    weeklyOpen: usesPeriodicQuota(value.consumptionModel) ? (value.weeklyOpen ?? 0) : 0,
    packClasses: value.consumptionModel === "pack" ? (value.packClasses ?? null) : null,
    active: value.active ?? true,
  }));

export const patchTariffSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    consumptionModel: tariffConsumptionSchema.optional(),
    billingPeriod: tariffBillingSchema.optional(),
    priceCents: z.number().int().min(0, "El precio no puede ser negativo").optional(),
    weeklyDirected: z.number().int().min(0).optional(),
    weeklyOpen: z.number().int().min(0).optional(),
    packClasses: z.number().int().positive().nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nada para actualizar" });

export const createMemberSchema = z.object({
  dni: z.string().trim().min(1, "El DNI es obligatorio"),
  password: z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres"),
  firstName: z.string().trim().min(1, "El nombre es obligatorio"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio"),
  phone: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email("Email inválido").nullable().optional(),
  tariffId: z.string().uuid(),
});

export const patchMemberSchema = z
  .object({
    dni: z.string().trim().min(1, "El DNI es obligatorio").optional(),
    firstName: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    lastName: z.string().trim().min(1, "El apellido es obligatorio").optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    email: z.string().trim().email("Email inválido").nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nada para actualizar" });

export const changeTariffSchema = z.object({
  tariffId: z.string().uuid(),
});

export const grantCreditsSchema = z.object({
  quantity: z
    .number()
    .int()
    .refine((value) => value !== 0, { message: "La cantidad no puede ser cero" }),
  note: z.string().trim().min(1).nullable().optional(),
});

export const weeklyQuotaAdjustmentSchema = z.object({
  kind: classKindSchema,
  delta: z
    .number()
    .int()
    .refine((value) => value !== 0, { message: "Indicá cuántas clases" }),
  note: z.string().trim().min(1).nullable().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres"),
});

export const memberListQuerySchema = z.object({
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export const templateWriteSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startTime: clockSchema,
  endTime: clockSchema,
  classTypeId: z.string().uuid(),
  coachId: z.string().uuid().nullable().optional(),
  defaultCapacity: z.number().int().positive("El aforo tiene que ser mayor que cero"),
});

export const patchTemplateSchema = templateWriteSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "Nada para actualizar" });

export const classTypeWriteSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  kind: classKindSchema,
});

export const classTypePatchSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nada para actualizar" });

export const trainingPhaseSchema = z.object({
  name: z.string().trim().min(1, "Cada fase necesita un nombre"),
  blocks: z
    .array(z.object({ body: z.string().trim().min(1, "Un bloque no puede estar vacío") }))
    .min(1, "Cada fase necesita al menos un bloque"),
});

export const trainingWriteSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  classTypeId: z.string().uuid(),
  phases: z.array(trainingPhaseSchema).min(1, "Un entrenamiento necesita al menos una fase"),
  confirmDetach: z.boolean().optional(),
});

export const trainingPatchSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    classTypeId: z.string().uuid().optional(),
    phases: z.array(trainingPhaseSchema).min(1, "Un entrenamiento necesita al menos una fase").optional(),
    confirmDetach: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.classTypeId !== undefined || value.phases !== undefined, {
    message: "Nada para actualizar",
  });

export const trainingListQuerySchema = z.object({
  classTypeId: z.string().uuid().optional(),
});

export const patchInstanceSchema = z
  .object({
    startTime: clockSchema.optional(),
    endTime: clockSchema.optional(),
    classTypeId: z.string().uuid().optional(),
    coachId: z.string().uuid().nullable().optional(),
    capacity: z.number().int().positive("El aforo tiene que ser mayor que cero").optional(),
    status: instanceStatusSchema.optional(),
    cancelReason: z.string().trim().min(1).nullable().optional(),
    trainingId: z.string().uuid().nullable().optional(),
    confirmCapacity: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).some((key) => key !== "confirmCapacity"), {
    message: "Nada para actualizar",
  });

export const createInstanceSchema = z.object({
  date: isoDateSchema,
  startTime: clockSchema,
  endTime: clockSchema,
  classTypeId: z.string().uuid(),
  coachId: z.string().uuid().nullable().optional(),
  capacity: z.number().int().positive("El aforo tiene que ser mayor que cero"),
});

const openingIntervalSchema = z
  .object({
    openTime: clockSchema,
    closeTime: clockSchema,
  })
  .refine((value) => {
    const seconds = (time: string) => {
      const [hour, minute, second = 0] = time.split(":").map(Number);
      return hour! * 3600 + minute! * 60 + second!;
    };
    return seconds(value.closeTime) > seconds(value.openTime);
  }, {
    message: "La hora de cierre tiene que ser posterior a la apertura",
    path: ["closeTime"],
  });

function validateNonOverlappingIntervals(
  intervals: { openTime: string; closeTime: string }[],
  ctx: z.RefinementCtx,
) {
  const sorted = [...intervals].sort((a, b) => a.openTime.localeCompare(b.openTime));
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous && current && current.openTime < previous.closeTime) {
      ctx.addIssue({ code: "custom", message: "Los tramos abiertos no pueden solaparse" });
      return;
    }
  }
}

const openingIntervalsSchema = z.array(openingIntervalSchema).superRefine(validateNonOverlappingIntervals);

export const boxHoursConfigSchema = z
  .object({
    weekly: z
      .array(
        z.object({
          weekday: z.number().int().min(1).max(7),
          intervals: openingIntervalsSchema,
        }),
      )
      .length(7),
    exceptions: z.array(
      z.object({
        date: isoDateSchema,
        intervals: openingIntervalsSchema,
      }),
    ),
  })
  .superRefine((value, ctx) => {
    const weekdays = value.weekly.map((day) => day.weekday);
    if (new Set(weekdays).size !== 7) {
      ctx.addIssue({ code: "custom", message: "El horario debe incluir cada día de la semana una vez" });
    }
    const dates = value.exceptions.map((exception) => exception.date);
    if (new Set(dates).size !== dates.length) {
      ctx.addIssue({ code: "custom", message: "No puede haber dos excepciones para la misma fecha" });
    }
  });

export const createStaffSchema = z.object({
  loginId: z.string().trim().min(1, "El usuario es obligatorio"),
  password: z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres"),
  firstName: z.string().trim().min(1, "El nombre es obligatorio"),
  lastName: z.string().trim().min(1, "El apellido es obligatorio"),
  role: z.enum(["coach", "admin"]),
  dni: z.string().trim().min(1).nullable().optional(),
});

export const patchStaffSchema = z
  .object({
    status: userStatusSchema.optional(),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    password: z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nada para actualizar" });

export const unpaidQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export const createPaymentSchema = z
  .object({
    userId: z.string().uuid(),
    billingPeriod: paymentBillingSchema,
    periodStart: isoDateSchema.optional(),
    amountCents: z.number().int().min(0),
    method: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.billingPeriod !== "one_time" && !value.periodStart) {
      ctx.addIssue({
        code: "custom",
        message: "Falta el inicio del periodo",
        path: ["periodStart"],
      });
    }
    if (value.billingPeriod === "one_time" && value.periodStart) {
      ctx.addIssue({
        code: "custom",
        message: "Un pago único no lleva periodo",
        path: ["periodStart"],
      });
    }
  });

export const adminDayQuerySchema = z.object({
  date: isoDateSchema,
});

export const adminWeekQuerySchema = z.object({
  from: isoDateSchema,
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;
export type CreateAdminBookingRequest = z.infer<typeof createAdminBookingRequestSchema>;
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
export type TariffWrite = z.infer<typeof tariffWriteSchema>;
export type PatchTariff = z.infer<typeof patchTariffSchema>;
export type CreateMember = z.infer<typeof createMemberSchema>;
export type PatchMember = z.infer<typeof patchMemberSchema>;
export type ChangeTariff = z.infer<typeof changeTariffSchema>;
export type GrantCredits = z.infer<typeof grantCreditsSchema>;
export type WeeklyQuotaAdjustment = z.infer<typeof weeklyQuotaAdjustmentSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type TemplateWrite = z.infer<typeof templateWriteSchema>;
export type PatchTemplate = z.infer<typeof patchTemplateSchema>;
export type ClassTypeWrite = z.infer<typeof classTypeWriteSchema>;
export type ClassTypePatch = z.infer<typeof classTypePatchSchema>;
export type TrainingWrite = z.infer<typeof trainingWriteSchema>;
export type TrainingPatch = z.infer<typeof trainingPatchSchema>;
export type PatchInstance = z.infer<typeof patchInstanceSchema>;
export type CreateInstance = z.infer<typeof createInstanceSchema>;
export type BoxHoursConfig = z.infer<typeof boxHoursConfigSchema>;
export type CreateStaff = z.infer<typeof createStaffSchema>;
export type PatchStaff = z.infer<typeof patchStaffSchema>;
export type CreatePayment = z.infer<typeof createPaymentSchema>;
