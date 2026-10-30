import type { Prisma } from "@prisma/client";
import type { Booking, ClassInstance, PropagationResult } from "@78feet/domain";
import type { Db } from "./db";

const UPDATE_BATCH_SIZE = 500;

type GroupedUpdate<T> = { ids: string[]; data: T };

export async function persistPropagationChanges(
  tx: Db,
  result: PropagationResult,
  beforeInstances: readonly ClassInstance[],
  beforeBookings: readonly Booking[],
  actorId: string,
): Promise<void> {
  const instancesById = new Map(beforeInstances.map((instance) => [instance.id, instance]));
  const instanceUpdates: { id: string; data: Prisma.ClassInstanceUncheckedUpdateManyInput }[] = [];

  for (const instance of result.instances) {
    const before = instancesById.get(instance.id);
    if (!before) continue;
    const data = instanceUpdate(before, instance);
    if (Object.keys(data).length > 0) instanceUpdates.push({ id: instance.id, data });
  }

  await runGroupedUpdates(instanceUpdates, (ids, data) =>
    tx.classInstance.updateMany({ where: { id: { in: ids } }, data }),
  );

  const bookingsById = new Map(beforeBookings.map((booking) => [booking.id, booking]));
  const bookingUpdates: { id: string; data: Prisma.BookingUncheckedUpdateManyInput }[] = [];

  for (const booking of result.bookings) {
    const before = bookingsById.get(booking.id);
    if (!before || sameBooking(before, booking)) continue;
    const cancelledBy =
      booking.status === "cancelled"
        ? booking.cancelledBy && isUuid(booking.cancelledBy)
          ? booking.cancelledBy
          : actorId
        : null;
    const data: Prisma.BookingUncheckedUpdateManyInput = {};
    if (before.instanceId !== booking.instanceId) data.instanceId = booking.instanceId;
    if (before.status !== booking.status) data.status = booking.status;
    if (before.quotaReturned !== booking.quotaReturned) data.quotaReturned = booking.quotaReturned;
    if (!sameDate(before.cancelledAt, booking.cancelledAt)) data.cancelledAt = booking.cancelledAt;
    if (before.cancelledBy !== cancelledBy) data.cancelledBy = cancelledBy;
    bookingUpdates.push({
      id: booking.id,
      data,
    });
  }

  await runGroupedUpdates(bookingUpdates, (ids, data) =>
    tx.booking.updateMany({ where: { id: { in: ids } }, data }),
  );
}

async function runGroupedUpdates<T>(
  updates: readonly { id: string; data: T }[],
  execute: (ids: string[], data: T) => Promise<unknown>,
): Promise<void> {
  const groups = new Map<string, GroupedUpdate<T>>();
  for (const update of updates) {
    const key = JSON.stringify(update.data);
    const group = groups.get(key);
    if (group) group.ids.push(update.id);
    else groups.set(key, { ids: [update.id], data: update.data });
  }

  for (const { ids, data } of groups.values()) {
    for (let start = 0; start < ids.length; start += UPDATE_BATCH_SIZE) {
      await execute(ids.slice(start, start + UPDATE_BATCH_SIZE), data);
    }
  }
}

function instanceUpdate(
  before: ClassInstance,
  after: ClassInstance,
): Prisma.ClassInstanceUncheckedUpdateManyInput {
  const data: Prisma.ClassInstanceUncheckedUpdateManyInput = {};
  if (before.startAt.getTime() !== after.startAt.getTime()) data.startAt = after.startAt;
  if (before.endAt.getTime() !== after.endAt.getTime()) data.endAt = after.endAt;
  if (before.classTypeId !== after.classTypeId) data.classTypeId = after.classTypeId;
  if (before.kind !== after.kind) data.kind = after.kind;
  if (before.coachId !== after.coachId) data.coachId = after.coachId;
  if (before.capacity !== after.capacity) data.capacity = after.capacity;
  if (before.status !== after.status) {
    data.status = after.status;
    if (before.status !== "cancelled" && after.status === "cancelled") {
      data.cancelReason = "Cambio de plantilla";
    }
  }
  if (before.trainingId !== after.trainingId) data.trainingId = after.trainingId;
  return data;
}

function sameBooking(left: Booking, right: Booking): boolean {
  return (
    left.instanceId === right.instanceId &&
    left.status === right.status &&
    left.quotaReturned === right.quotaReturned
  );
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return left?.getTime() === right?.getTime();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
