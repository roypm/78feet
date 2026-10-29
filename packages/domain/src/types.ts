export type Role = "member" | "coach" | "admin";
export type UserStatus = "active" | "inactive";
export type TariffKind = "monthly" | "pack";
export type ClassKind = "directed" | "open";
export type InstanceStatus = "scheduled" | "cancelled";
export type BookingPool = "weekly_directed" | "weekly_open" | "pack";
export type BookingStatus = "active" | "cancelled";
export type EndedReason = "change" | "cancelled";
export type PaymentKind = "monthly" | "pack";

export type ClassTemplate = {
  id: string;
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

export type TariffSnapshot = {
  id: string;
  kind: TariffKind;
  weeklyDirected: number;
  weeklyOpen: number;
};

export type PlannedInstance = {
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
