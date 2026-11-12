export type Role = "member" | "coach" | "admin";
export type UserStatus = "active" | "inactive";
export type TariffConsumption = "weekly_quota" | "monthly_quota" | "pack";
export type QuotaPeriod = "week" | "month";
export type TariffBilling = "monthly" | "quarterly" | "semiannual" | "annual" | "none" | "one_time";
export type PaymentBilling = "monthly" | "quarterly" | "semiannual" | "annual" | "one_time";
export type ClassKind = "directed" | "open";
export type InstanceStatus = "scheduled" | "cancelled";
export type BookingPool = "quota_directed" | "quota_open" | "pack";
export type BookingStatus = "active" | "cancelled";
export type EndedReason = "change" | "cancelled";

/** `null` = cupo ilimitado. Cero sigue significando que ese cupo no entra. */
export type QuotaLimit = number | null;

export type TariffSnapshot = {
  id: string;
  consumptionModel: TariffConsumption;
  quotaDirected: QuotaLimit;
  quotaOpen: QuotaLimit;
};

export type ClassTemplate = {
  id: string;
  boxId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  kind: ClassKind;
  coachId: string | null;
  defaultCapacity: number;
  active: boolean;
};

export type ClassInstance = {
  id: string;
  boxId: string;
  templateId: string | null;
  date: string;
  startAt: Date;
  endAt: Date;
  classTypeId: string;
  kind: ClassKind;
  coachId: string | null;
  capacity: number;
  status: InstanceStatus;
  trainingId: string | null;
  trainingClassTypeId: string | null;
  editedAt: Date | null;
};

export type Booking = {
  id: string;
  instanceId: string;
  userId: string;
  pool: BookingPool;
  status: BookingStatus;
  quotaReturned: boolean | null;
  createdBy: string;
  cancelledAt: Date | null;
  cancelledBy: string | null;
};

export type CreditGrant = {
  id: string;
  userId: string;
  quantity: number;
};

export type MembershipSnapshot = {
  userId: string;
  tariffId: string;
  endedAt: Date | null;
};

export type PlannedInstance = {
  boxId: string;
  templateId: string;
  date: string;
  startAt: Date;
  endAt: Date;
  classTypeId: string;
  kind: ClassKind;
  coachId: string | null;
  capacity: number;
  status: "scheduled";
};

export type TemplateChange =
  | { type: "delete" }
  | { type: "update"; template: ClassTemplate };

export type PropagationSummary = {
  cancelledClassCount: number;
  cancelledBookingCount: number;
  movedBookingCount: number;
};

export type PropagationResult = {
  instances: ClassInstance[];
  bookings: Booking[];
  summary: PropagationSummary;
};

export type TrainingPhaseInput = {
  name: string;
  blocks: { body: string }[];
};
