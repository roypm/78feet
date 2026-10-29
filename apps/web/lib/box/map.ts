import type { Booking, ClassInstance, ClassTemplate } from "@78feet/domain";
import { isoDateFromDb, clockFromDb } from "./time";
import { classTypeImageUrl } from "./images";

export function toDomainTemplate(row: {
  id: string;
  weekday: number;
  startTime: Date;
  endTime: Date;
  classTypeId: string;
  classType?: { kind: "directed" | "open" };
  kind?: "directed" | "open";
  coachId: string | null;
  defaultCapacity: number;
  active: boolean;
}): ClassTemplate {
  return {
    id: row.id,
    weekday: row.weekday,
    startTime: clockFromDb(row.startTime),
    endTime: clockFromDb(row.endTime),
    classTypeId: row.classTypeId,
    kind: row.classType?.kind ?? row.kind ?? "directed",
    coachId: row.coachId,
    defaultCapacity: row.defaultCapacity,
    active: row.active,
  };
}

export function toDomainInstance(row: {
  id: string;
  templateId: string | null;
  date: Date;
  startAt: Date;
  endAt: Date;
  classTypeId: string;
  kind: "directed" | "open";
  coachId: string | null;
  capacity: number;
  status: "scheduled" | "cancelled";
  trainingId?: string | null;
  training?: { classTypeId: string } | null;
  editedAt: Date | null;
}): ClassInstance {
  return {
    id: row.id,
    templateId: row.templateId,
    date: isoDateFromDb(row.date),
    startAt: row.startAt,
    endAt: row.endAt,
    classTypeId: row.classTypeId,
    kind: row.kind,
    coachId: row.coachId,
    capacity: row.capacity,
    status: row.status,
    trainingId: row.trainingId ?? null,
    trainingClassTypeId: row.training?.classTypeId ?? null,
    editedAt: row.editedAt,
  };
}

export function toDomainBooking(row: {
  id: string;
  instanceId: string;
  userId: string;
  pool: Booking["pool"];
  status: Booking["status"];
  quotaReturned: boolean | null;
  createdBy: string;
  cancelledAt: Date | null;
  cancelledBy: string | null;
}): Booking {
  return {
    id: row.id,
    instanceId: row.instanceId,
    userId: row.userId,
    pool: row.pool,
    status: row.status,
    quotaReturned: row.quotaReturned,
    createdBy: row.createdBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
  };
}

export function typeView(row: { id: string; name: string; kind: "directed" | "open"; imageKey: string }) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    imageKey: row.imageKey,
    imageUrl: classTypeImageUrl(row.imageKey),
  };
}

export function personName(person: { firstName: string; lastName: string } | null): string | null {
  if (!person) return null;
  const name = `${person.firstName} ${person.lastName}`.trim();
  return name.length > 0 ? name : null;
}
