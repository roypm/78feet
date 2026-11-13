import { z } from "zod";
export { z };
export * from "@78feet/domain";
export const id = z.uuid();
export const dateTime = z.iso.datetime({ offset: true });
export const error = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
  detachCount: z.number().int().nonnegative().optional(),
});
export const ok = z.object({ ok: z.boolean() });
export const identified = z.object({ id });
export const boxDto = z.object({ id, name: z.string(), slug: z.string() });
export const typeDto = z.object({
  id,
  name: z.string(),
  slug: z.string(),
  kind: z.enum(["directed", "open"]),
  imageKey: z.string().nullable(),
  imageUrl: z.string().nullable(),
});
export const tariffDto = z.object({
  id,
  name: z.string(),
  priceCents: z.number().int(),
  consumptionModel: z.enum(["weekly_quota", "monthly_quota", "pack"]),
  billingPeriod: z.enum([
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "none",
    "one_time",
  ]),
  quotaDirected: z.number().int().nullable(),
  quotaOpen: z.number().int().nullable(),
  packClasses: z.number().int().nullable(),
  active: z.boolean(),
  createdAt: dateTime,
});
export const personDto = z.object({
  id,
  role: z.enum(["member", "coach", "admin"]),
  status: z.enum(["active", "inactive"]),
  firstName: z.string(),
  lastName: z.string(),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  loginId: z.string(),
  email: z.email(),
  theme: z.enum(["light", "dark", "system"]),
  preferenceBoxId: id.nullable(),
  paymentBoxId: id.nullable(),
  profileImageUrl: z.string().nullable(),
  tariffName: z.string().nullable().optional(),
  paymentBoxName: z.string().nullable().optional(),
});
export const pageInfo = z.object({
  page: z.number().int().positive(),
  pageSize: z.literal(25),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
});
export const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), pageInfo });
export const trainingDto = z.object({
  id,
  name: z.string(),
  classTypeId: id,
  classTypeName: z.string(),
  phases: z.array(
    z.object({
      id,
      name: z.string(),
      blocks: z.array(z.object({ id, body: z.string() })),
    }),
  ),
});
export const trainingCard = trainingDto.omit({ phases: true });
export const classDto = z.object({
  id,
  boxId: id,
  boxName: z.string(),
  date: z.iso.date(),
  startAt: dateTime,
  endAt: dateTime,
  name: z.string(),
  classTypeId: id,
  imageUrl: z.string().nullable(),
  kind: z.enum(["directed", "open"]),
  status: z.enum(["scheduled", "cancelled"]),
  capacity: z.number().int(),
  bookedCount: z.number().int(),
  freeSpots: z.number().int(),
  coachName: z.string().nullable(),
  bookedByMe: z.boolean(),
  isException: z.boolean(),
  trainingId: id.nullable(),
  coachProfileImageUrl: z.string().nullable(),
});
export const memberRoster = z.object({
  userId: id,
  name: z.string(),
  profileImageUrl: z.string().nullable(),
});
export const staffRoster = memberRoster.extend({
  bookingId: id,
  shortName: z.string(),
  phone: z.string().nullable(),
});
export const detailDto = classDto.extend({
  bookingId: id.nullable(),
  canBook: z.boolean(),
  canCancel: z.boolean(),
  training: trainingDto.nullable(),
  roster: z.array(memberRoster),
});
export const staffDetailDto = detailDto.extend({
  roster: z.array(staffRoster),
});
export const bookingDto = z.object({
  id,
  instanceId: id,
  userId: id,
  pool: z.enum(["quota_directed", "quota_open", "pack"]),
  status: z.enum(["active", "cancelled"]),
  createdBy: id,
  createdAt: dateTime,
  cancelledAt: dateTime.nullable(),
  cancelledBy: id.nullable(),
  quotaReturned: z.boolean().nullable(),
});
export const bookingCard = bookingDto
  .pick({
    id: true,
    instanceId: true,
    userId: true,
    pool: true,
    status: true,
    quotaReturned: true,
  })
  .extend({
    date: z.iso.date(),
    startAt: dateTime,
    endAt: dateTime,
    instanceStatus: z.enum(["scheduled", "cancelled"]),
    kind: z.enum(["directed", "open"]),
    classTypeName: z.string(),
    boxName: z.string(),
  });
export const paymentDto = z.object({
  id,
  userId: id,
  paymentBoxId: id,
  billingPeriod: z.enum([
    "monthly",
    "quarterly",
    "semiannual",
    "annual",
    "one_time",
  ]),
  periodStart: z.iso.date().nullable(),
  amountCents: z.number().int(),
  method: z.string().nullable(),
  recordedBy: id,
  createdAt: dateTime,
});
export const paymentCard = paymentDto
  .omit({ userId: true, paymentBoxId: true, recordedBy: true })
  .extend({
    memberId: id,
    memberName: z.string(),
    recordedByName: z.string(),
    paymentBoxName: z.string(),
  });
export const membershipDto = z.object({
  id,
  userId: id,
  tariffId: id,
  startedAt: dateTime,
  endedAt: dateTime.nullable(),
  endedReason: z.enum(["change", "cancelled"]).nullable(),
});
export const summaryDto = z.object({
  tariff: tariffDto
    .pick({
      name: true,
      consumptionModel: true,
      billingPeriod: true,
      priceCents: true,
      quotaDirected: true,
      quotaOpen: true,
    })
    .nullable(),
  quota: z.object({
    period: z.enum(["week", "month"]).nullable(),
    periodStart: z.iso.date().nullable(),
    periodEnd: z.iso.date().nullable(),
    periodLabel: z.string().nullable(),
    directedUsed: z.number().int(),
    directedLimit: z.number().int().nullable(),
    directedAdjustment: z.number().int(),
    openUsed: z.number().int(),
    openLimit: z.number().int().nullable(),
    openAdjustment: z.number().int(),
    packBalance: z.number().int(),
  }),
  payment: z
    .object({
      status: z.enum(["paid", "pending"]),
      billingPeriod: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
      periodStart: z.iso.date(),
      periodLabel: z.string(),
    })
    .nullable(),
});
export const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  order: z.string().optional(),
  box: id.optional(),
  type: id.optional(),
  status: z.enum(["active", "inactive", "all"]).optional(),
});
export const loginBody = z
  .object({
    access: z.enum(["member", "staff"]),
    loginId: z.string().trim().min(1).max(256),
    password: z.string().min(1),
  })
  .strict();
export const templateDto = z.object({
  id,
  boxId: id,
  weekday: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
  coachId: id.nullable(),
  defaultCapacity: z.number().int(),
  active: z.boolean(),
  classTypeId: id,
  kind: z.enum(["directed", "open"]),
  classTypeName: z.string(),
  imageUrl: z.string().nullable(),
});
export const propagationDto = z.object({
  summary: z.object({
    cancelledClassCount: z.number().int(),
    cancelledBookingCount: z.number().int(),
    movedBookingCount: z.number().int(),
  }),
});
export const memberMembership = z.object({
  id,
  tariffId: id,
  tariffName: z.string(),
  consumptionModel: tariffDto.shape.consumptionModel,
  billingPeriod: tariffDto.shape.billingPeriod,
  priceCents: z.number().int(),
  startedAt: dateTime,
  endedAt: dateTime.nullable(),
});
export const memberDto = personDto.extend({
  membership: memberMembership.nullable(),
  paymentBoxName: z.string().nullable(),
});
export const memberListDto = memberDto.extend({
  packBalance: z.number().int(),
});
export const staffDto = personDto.extend({ role: z.enum(["coach", "admin"]) });
export const trainingView = trainingDto.extend({
  classType: typeDto,
  createdAt: dateTime,
  updatedAt: dateTime,
  hasAssignedClasses: z.boolean(),
  phases: z.array(
    z.object({
      id,
      name: z.string(),
      position: z.number().int(),
      blocks: z.array(
        z.object({ id, body: z.string(), position: z.number().int() }),
      ),
    }),
  ),
});
export const trainingListCard = trainingCard.extend({
  updatedAt: dateTime,
  phaseNames: z.array(z.string()),
});
export const staffInstance = staffDetailDto.extend({
  boxSlug: z.string(),
  coachId: id.nullable(),
  trainingName: z.string().nullable(),
  editedAt: dateTime.nullable(),
  isExtra: z.boolean(),
  isModified: z.boolean(),
  canRemoveExtra: z.boolean(),
  canRecover: z.boolean(),
  canRestoreFromTemplate: z.boolean(),
  bookingHistoryCount: z.number().int(),
  cancelReason: z.string().nullable(),
});
export const bookingView = bookingDto.extend({
  instance: classDto.pick({
    id: true,
    date: true,
    name: true,
    boxName: true,
    kind: true,
    startAt: true,
    endAt: true,
    capacity: true,
    status: true,
  }),
});
export const historyView = bookingView.extend({
  canCancel: z.boolean(),
  boxCancelled: z.boolean(),
  coachName: z.string().nullable(),
  coachProfileImageUrl: z.string().nullable(),
});
export const unpaidDto = z.object({
  id,
  firstName: z.string(),
  lastName: z.string(),
  dni: z.string().nullable(),
  phone: z.string().nullable(),
  tariffName: z.string(),
  priceCents: z.number().int(),
  billingPeriod: z.enum(["monthly", "quarterly", "semiannual", "annual"]),
  periodStart: z.iso.date(),
  periodLabel: z.string(),
});
export const exceptionDto = classDto.extend({
  kinds: z.array(z.enum(["extra", "modified", "cancelled"])),
});
export const creditDto = z.object({
  grant: z.object({
    id,
    userId: id,
    quantity: z.number().int(),
    paymentId: id.nullable(),
    note: z.string().nullable(),
    createdBy: id,
    createdAt: dateTime,
  }),
  balance: z.number().int(),
});
export const adjustmentDto = z.object({
  adjustment: z.object({
    id,
    userId: id,
    kind: z.enum(["directed", "open"]),
    delta: z.number().int(),
    note: z.string().nullable(),
    createdBy: id,
    createdAt: dateTime,
    period: z.enum(["week", "month"]),
    periodStart: z.iso.date(),
  }),
  available: z.number().int(),
});
export const idParams = z.object({ id });
export const personOption = z.object({
  id,
  firstName: z.string(),
  lastName: z.string(),
  dni: z.string().nullable(),
});
export const coachOption = z.object({
  id,
  name: z.string(),
  role: z.enum(["coach", "admin"]),
  profileImageUrl: z.string().nullable(),
});
export const trainingOption = z.object({
  id,
  name: z.string(),
  classTypeId: id,
});
export const emailRequired = z
  .string()
  .trim()
  .email("El correo es obligatorio");
