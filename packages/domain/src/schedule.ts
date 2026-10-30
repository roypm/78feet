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
import type { BoxHoursConfig } from "./schemas";

export function instanceKey(templateId: string, date: string): string {
  return `${templateId}|${date}`;
}

export function assertValidTimeRange(startTime: string, endTime: string): void {
  if (clockToMinutes(endTime) <= clockToMinutes(startTime)) {
    throw new DomainError("FORBIDDEN", "La hora de fin debe ser posterior a la de inicio");
  }
}

export function openingIntervalsForDate(config: BoxHoursConfig, date: string) {
  const exception = config.exceptions.find((item) => item.date === date);
  if (exception) return exception.intervals;
  const weekday = weekdayMonday1(date);
  return config.weekly.find((item) => item.weekday === weekday)?.intervals ?? [];
}

export function isWithinOpeningIntervals(
  intervals: readonly { openTime: string; closeTime: string }[],
  startTime: string,
  endTime: string,
): boolean {
  const start = clockToMinutes(startTime);
  const end = clockToMinutes(endTime);
  const sorted = intervals
    .map((interval) => ({ start: clockToMinutes(interval.openTime), end: clockToMinutes(interval.closeTime) }))
    .sort((a, b) => a.start - b.start);
  let openStart = -1;
  let openEnd = -1;
  for (const interval of sorted) {
    if (openStart < 0 || interval.start > openEnd) {
      openStart = interval.start;
      openEnd = interval.end;
    } else {
      openEnd = Math.max(openEnd, interval.end);
    }
    if (openStart <= start && end <= openEnd) return true;
  }
  return false;
}

export function isOpenDuring(config: BoxHoursConfig, date: string, startTime: string, endTime: string): boolean {
  return isWithinOpeningIntervals(openingIntervalsForDate(config, date), startTime, endTime);
}

export function templatesOverlap(
  a: Pick<ClassTemplate, "weekday" | "startTime" | "endTime">,
  b: Pick<ClassTemplate, "weekday" | "startTime" | "endTime">,
): boolean {
  if (a.weekday !== b.weekday) return false;
  return clockIntervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime);
}

export function templateConflicts(
  candidate: Pick<ClassTemplate, "weekday" | "startTime" | "endTime" | "kind"> & { id?: string },
  others: readonly (Pick<ClassTemplate, "id" | "weekday" | "startTime" | "endTime" | "active" | "kind">)[],
): boolean {
  return others.some((other) => {
    if (!other.active) return false;
    if (other.kind !== candidate.kind) return false;
    if (candidate.id !== undefined && other.id === candidate.id) return false;
    return templatesOverlap(candidate, other);
  });
}

export function instanceConflicts(
  candidate: Pick<ClassInstance, "date" | "startAt" | "endAt" | "kind"> & { id?: string },
  others: readonly Pick<ClassInstance, "id" | "date" | "startAt" | "endAt" | "status" | "kind">[],
): boolean {
  return others.some((other) => {
    if (other.status !== "scheduled") return false;
    if (other.kind !== candidate.kind) return false;
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

function findSuccessor(
  instancesByIdentity: ReadonlyMap<string, readonly ClassInstance[]>,
  identity: string,
  exceptId: string,
): ClassInstance | undefined {
  return instancesByIdentity.get(identity)?.find(
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
  bookingsByInstance: Map<string, number[]>,
  activeCounts: Map<string, number>,
  fromInstanceId: string,
  toInstanceId: string,
): number {
  let moved = 0;
  const sourceIndexes = bookingsByInstance.get(fromInstanceId) ?? [];
  const targetIndexes = bookingsByInstance.get(toInstanceId) ?? [];
  for (const i of sourceIndexes) {
    const booking = bookings[i];
    if (!booking || booking.instanceId !== fromInstanceId || booking.status !== "active") continue;
    bookings[i] = { ...booking, instanceId: toInstanceId };
    targetIndexes.push(i);
    moved += 1;
  }
  if (targetIndexes.length > 0) bookingsByInstance.set(toInstanceId, targetIndexes);
  activeCounts.set(fromInstanceId, (activeCounts.get(fromInstanceId) ?? 0) - moved);
  activeCounts.set(toInstanceId, (activeCounts.get(toInstanceId) ?? 0) + moved);
  bookingsByInstance.set(fromInstanceId, sourceIndexes);
  return moved;
}

function cancelActiveBookings(
  bookings: Booking[],
  bookingsByInstance: ReadonlyMap<string, readonly number[]>,
  activeCounts: Map<string, number>,
  instanceId: string,
  at: Date,
): number {
  let cancelled = 0;
  for (const i of bookingsByInstance.get(instanceId) ?? []) {
    const booking = bookings[i];
    if (!booking || booking.instanceId !== instanceId || booking.status !== "active") continue;
    bookings[i] = applyCancellation(booking, true, at, "system");
    cancelled += 1;
  }
  activeCounts.set(instanceId, (activeCounts.get(instanceId) ?? 0) - cancelled);
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
  const instancesByIdentity = new Map<string, ClassInstance[]>();
  for (const instance of instances) {
    const identity = identityKey(instance);
    const bucket = instancesByIdentity.get(identity) ?? [];
    bucket.push(instance);
    instancesByIdentity.set(identity, bucket);
  }
  const bookingsByInstance = new Map<string, number[]>();
  const activeCounts = new Map<string, number>();
  for (const [index, booking] of bookings.entries()) {
    const bucket = bookingsByInstance.get(booking.instanceId) ?? [];
    bucket.push(index);
    bookingsByInstance.set(booking.instanceId, bucket);
    if (booking.status === "active") {
      activeCounts.set(booking.instanceId, (activeCounts.get(booking.instanceId) ?? 0) + 1);
    }
  }
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
      const successor = findSuccessor(instancesByIdentity, identityKey(instance), instance.id);
      const currentActive = activeCounts.get(instance.id) ?? 0;
      if (
        successor &&
        successor.capacity >= (activeCounts.get(successor.id) ?? 0) + currentActive
      ) {
        summary.movedBookingCount += moveActiveBookings(
          bookings,
          bookingsByInstance,
          activeCounts,
          instance.id,
          successor.id,
        );
        followTraining(instance, successor);
      } else {
        summary.cancelledBookingCount += cancelActiveBookings(
          bookings,
          bookingsByInstance,
          activeCounts,
          instance.id,
          now,
        );
      }
      instance.status = "cancelled";
      summary.cancelledClassCount += 1;
      continue;
    }

    if (params.change.type !== "update") continue;
    const template = params.change.template;

    if (identityChanged(instance, template)) {
      const successor = findSuccessor(instancesByIdentity, newSlotIdentity(instance, template), instance.id);
      const currentActive = activeCounts.get(instance.id) ?? 0;
      if (
        successor &&
        successor.capacity >= (activeCounts.get(successor.id) ?? 0) + currentActive
      ) {
        summary.movedBookingCount += moveActiveBookings(
          bookings,
          bookingsByInstance,
          activeCounts,
          instance.id,
          successor.id,
        );
        followTraining(instance, successor);
      } else {
        summary.cancelledBookingCount += cancelActiveBookings(
          bookings,
          bookingsByInstance,
          activeCounts,
          instance.id,
          now,
        );
      }
      const previousIdentity = identityKey(instance);
      Object.assign(instance, applyTemplateValues(instance, template));
      const nextIdentity = identityKey(instance);
      if (nextIdentity !== previousIdentity) {
        const bucket = instancesByIdentity.get(nextIdentity) ?? [];
        bucket.push(instance);
        instancesByIdentity.set(nextIdentity, bucket);
      }
      continue;
    }

    if (shouldCancelAllForCapacity(template.defaultCapacity, activeCounts.get(instance.id) ?? 0)) {
      summary.cancelledBookingCount += cancelActiveBookings(
        bookings,
        bookingsByInstance,
        activeCounts,
        instance.id,
        now,
      );
      instance.capacity = template.defaultCapacity;
      instance.coachId = template.coachId;
      continue;
    }

    instance.coachId = template.coachId;
    instance.capacity = template.defaultCapacity;
  }

  return { instances, bookings, summary };
}
