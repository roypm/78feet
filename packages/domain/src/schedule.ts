import { DomainError } from "./errors";
import { applyCancellation } from "./booking";
import {
  atBoxTime,
  clockIntervalsOverlap,
  clockToMinutes,
  datesOnWeekday,
  intervalsOverlap,
  nextMondayDate,
  weekdayMonday1,
} from "./time";
import type {
  Booking,
  ClassInstance,
  ClassTemplate,
  PlannedInstance,
  PropagationResult,
  TemplateChange,
} from "./types";

export function instanceKey(templateId: string, date: string): string {
  return `${templateId}|${date}`;
}

export function assertValidTimeRange(startTime: string, endTime: string): void {
  if (clockToMinutes(endTime) <= clockToMinutes(startTime)) {
    throw new DomainError("FORBIDDEN", "La hora de fin debe ser posterior a la de inicio");
  }
}

export function templatesOverlap(
  a: Pick<ClassTemplate, "weekday" | "startTime" | "endTime">,
  b: Pick<ClassTemplate, "weekday" | "startTime" | "endTime">,
): boolean {
  if (a.weekday !== b.weekday) return false;
  return clockIntervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime);
}

export function templateConflicts(
  candidate: Pick<ClassTemplate, "weekday" | "startTime" | "endTime"> & { id?: string },
  others: readonly (Pick<ClassTemplate, "id" | "weekday" | "startTime" | "endTime" | "active">)[],
): boolean {
  return others.some((other) => {
    if (!other.active) return false;
    if (candidate.id !== undefined && other.id === candidate.id) return false;
    return templatesOverlap(candidate, other);
  });
}

export function instanceConflicts(
  candidate: Pick<ClassInstance, "date" | "startAt" | "endAt"> & { id?: string },
  others: readonly Pick<ClassInstance, "id" | "date" | "startAt" | "endAt" | "status">[],
): boolean {
  return others.some((other) => {
    if (other.status !== "scheduled") return false;
    if (candidate.id !== undefined && other.id === candidate.id) return false;
    if (other.date !== candidate.date) return false;
    return intervalsOverlap(candidate.startAt, candidate.endAt, other.startAt, other.endAt);
  });
}

export function assertSameDayMove(currentDate: string, nextDate: string): void {
  if (currentDate !== nextDate) {
    throw new DomainError("FORBIDDEN", "No se puede mover una clase a otro día");
  }
}

export function shouldCancelAllForCapacity(capacity: number, activeCount: number): boolean {
  return capacity < activeCount;
}

export function planMaterializedInstances(params: {
  templates: readonly ClassTemplate[];
  existingKeys: ReadonlySet<string>;
  from: string;
  to: string;
}): PlannedInstance[] {
  const planned: PlannedInstance[] = [];
  for (const template of params.templates) {
    if (!template.active) continue;
    for (const date of datesOnWeekday(params.from, params.to, template.weekday)) {
      if (params.existingKeys.has(instanceKey(template.id, date))) continue;
      planned.push({
        templateId: template.id,
        date,
        startAt: atBoxTime(date, template.startTime),
        endAt: atBoxTime(date, template.endTime),
        classTypeId: template.classTypeId,
        kind: template.kind,
        coachId: template.coachId,
        capacity: template.defaultCapacity,
        status: "scheduled",
      });
    }
  }
  return planned;
}

function identityKey(instance: Pick<ClassInstance, "date" | "startAt" | "endAt" | "classTypeId">): string {
  return `${instance.date}|${instance.startAt.toISOString()}|${instance.endAt.toISOString()}|${instance.classTypeId}`;
}

function cloneInstance(instance: ClassInstance): ClassInstance {
  return { ...instance };
}

function cloneBooking(booking: Booking): Booking {
  return { ...booking };
}

function activeCount(bookings: readonly Booking[], instanceId: string): number {
  return bookings.filter((booking) => booking.instanceId === instanceId && booking.status === "active").length;
}

function findSuccessor(
  instances: readonly ClassInstance[],
  identity: string,
  exceptId: string,
): ClassInstance | undefined {
  return instances.find(
    (instance) =>
      instance.id !== exceptId &&
      instance.status === "scheduled" &&
      identityKey(instance) === identity,
  );
}

function followTraining(from: ClassInstance, to: ClassInstance): void {
  if (to.trainingId) return;
  if (!from.trainingId) return;
  if (from.trainingClassTypeId !== to.classTypeId) return;
  to.trainingId = from.trainingId;
  to.trainingClassTypeId = from.trainingClassTypeId;
}

function alignTraining(instance: ClassInstance): void {
  if (instance.trainingId && instance.trainingClassTypeId !== instance.classTypeId) {
    instance.trainingId = null;
    instance.trainingClassTypeId = null;
  }
}

function moveActiveBookings(
  bookings: Booking[],
  fromInstanceId: string,
  toInstanceId: string,
): number {
  let moved = 0;
  for (let i = 0; i < bookings.length; i += 1) {
    const booking = bookings[i];
    if (!booking || booking.instanceId !== fromInstanceId || booking.status !== "active") continue;
    bookings[i] = { ...booking, instanceId: toInstanceId };
    moved += 1;
  }
  return moved;
}

function cancelActiveBookings(
  bookings: Booking[],
  instanceId: string,
  at: Date,
): number {
  let cancelled = 0;
  for (let i = 0; i < bookings.length; i += 1) {
    const booking = bookings[i];
    if (!booking || booking.instanceId !== instanceId || booking.status !== "active") continue;
    bookings[i] = applyCancellation(booking, true, at, "system");
    cancelled += 1;
  }
  return cancelled;
}

function newSlotIdentity(instance: ClassInstance, template: ClassTemplate): string {
  return identityKey({
    date: instance.date,
    startAt: atBoxTime(instance.date, template.startTime),
    endAt: atBoxTime(instance.date, template.endTime),
    classTypeId: template.classTypeId,
  });
}

function identityChanged(instance: ClassInstance, template: ClassTemplate): boolean {
  return identityKey(instance) !== newSlotIdentity(instance, template);
}

function applyTemplateValues(instance: ClassInstance, template: ClassTemplate): ClassInstance {
  const next: ClassInstance = {
    ...instance,
    startAt: atBoxTime(instance.date, template.startTime),
    endAt: atBoxTime(instance.date, template.endTime),
    classTypeId: template.classTypeId,
    kind: template.kind,
    coachId: template.coachId,
    capacity: template.defaultCapacity,
  };
  alignTraining(next);
  return next;
}

export function propagateTemplateChange(params: {
  today: string;
  templateId: string;
  change: TemplateChange;
  instances: readonly ClassInstance[];
  bookings: readonly Booking[];
  now?: Date;
}): PropagationResult {
  const now = params.now ?? atBoxTime(params.today, "12:00:00");
  const nextMonday = nextMondayDate(params.today);
  const instances = params.instances.map(cloneInstance);
  const bookings = params.bookings.map(cloneBooking);
  const summary = {
    cancelledClassCount: 0,
    cancelledBookingCount: 0,
    movedBookingCount: 0,
  };

  const affected = instances.filter(
    (instance) =>
      instance.templateId === params.templateId &&
      instance.date >= nextMonday &&
      instance.editedAt === null,
  );

  for (const instance of affected) {
    const eliminated =
      params.change.type === "delete" ||
      (params.change.type === "update" && weekdayMonday1(instance.date) !== params.change.template.weekday);

    if (eliminated) {
      const successor = findSuccessor(instances, identityKey(instance), instance.id);
      const currentActive = activeCount(bookings, instance.id);
      if (
        successor &&
        successor.capacity >= activeCount(bookings, successor.id) + currentActive
      ) {
        summary.movedBookingCount += moveActiveBookings(bookings, instance.id, successor.id);
        followTraining(instance, successor);
      } else {
        summary.cancelledBookingCount += cancelActiveBookings(bookings, instance.id, now);
      }
      instance.status = "cancelled";
      summary.cancelledClassCount += 1;
      continue;
    }

    if (params.change.type !== "update") continue;
    const template = params.change.template;

    if (identityChanged(instance, template)) {
      const successor = findSuccessor(instances, newSlotIdentity(instance, template), instance.id);
      const currentActive = activeCount(bookings, instance.id);
      if (
        successor &&
        successor.capacity >= activeCount(bookings, successor.id) + currentActive
      ) {
        summary.movedBookingCount += moveActiveBookings(bookings, instance.id, successor.id);
        followTraining(instance, successor);
      } else {
        summary.cancelledBookingCount += cancelActiveBookings(bookings, instance.id, now);
      }
      Object.assign(instance, applyTemplateValues(instance, template));
      continue;
    }

    if (shouldCancelAllForCapacity(template.defaultCapacity, activeCount(bookings, instance.id))) {
      summary.cancelledBookingCount += cancelActiveBookings(bookings, instance.id, now);
      instance.capacity = template.defaultCapacity;
      instance.coachId = template.coachId;
      continue;
    }

    instance.coachId = template.coachId;
    instance.capacity = template.defaultCapacity;
  }

  return { instances, bookings, summary };
}
