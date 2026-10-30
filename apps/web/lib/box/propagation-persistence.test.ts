import { describe, expect, it, vi } from "vitest";
import type { Booking, ClassInstance, PropagationResult } from "@78feet/domain";
import type { Db } from "./db";
import { persistPropagationChanges } from "./propagation-persistence";

const cancelledAt = new Date("2026-11-02T10:00:00.000Z");
const actorId = "admin-1";

function instance(id: string, overrides: Partial<ClassInstance> = {}): ClassInstance {
  return {
    id,
    templateId: `template-${id}`,
    date: "2026-11-02",
    startAt: new Date("2026-11-02T17:00:00.000Z"),
    endAt: new Date("2026-11-02T18:00:00.000Z"),
    classTypeId: "type-wod",
    kind: "directed",
    coachId: "coach-1",
    capacity: 12,
    status: "scheduled",
    trainingId: null,
    trainingClassTypeId: null,
    editedAt: null,
    ...overrides,
  };
}

function booking(id: string, instanceId: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    instanceId,
    userId: `member-${id}`,
    pool: "weekly_directed",
    status: "active",
    quotaReturned: null,
    createdBy: actorId,
    cancelledAt: null,
    cancelledBy: null,
    ...overrides,
  };
}

function fakeDb(instances: ClassInstance[], bookings: Booking[]) {
  const updateInstances = vi.fn(async (args: { where: { id: { in: string[] } }; data: object }) => {
    for (const row of instances) {
      if (args.where.id.in.includes(row.id)) Object.assign(row, args.data);
    }
    return { count: args.where.id.in.length };
  });
  const updateBookings = vi.fn(async (args: { where: { id: { in: string[] } }; data: object }) => {
    for (const row of bookings) {
      if (args.where.id.in.includes(row.id)) Object.assign(row, args.data);
    }
    return { count: args.where.id.in.length };
  });
  return {
    db: {
      classInstance: { updateMany: updateInstances },
      booking: { updateMany: updateBookings },
    } as unknown as Db,
    updateInstances,
    updateBookings,
  };
}

describe("persistencia de cambios de plantilla", () => {
  it("agrupa cancelaciones de clases y reservas con el mismo cambio", async () => {
    const beforeInstances = Array.from({ length: 4 }, (_, index) => instance(`class-${index}`));
    const beforeBookings = beforeInstances.flatMap((row, instanceIndex) =>
      Array.from({ length: 12 }, (_, bookingIndex) => booking(`booking-${instanceIndex}-${bookingIndex}`, row.id)),
    );
    const result: PropagationResult = {
      instances: beforeInstances.map((row) => ({ ...row, status: "cancelled" })),
      bookings: beforeBookings.map((row) => ({
        ...row,
        status: "cancelled",
        quotaReturned: true,
        cancelledAt,
        cancelledBy: "system",
      })),
      summary: { cancelledClassCount: 4, cancelledBookingCount: 48, movedBookingCount: 0 },
    };
    const persistedInstances = beforeInstances.map((row) => ({ ...row }));
    const persistedBookings = beforeBookings.map((row) => ({ ...row }));
    const fake = fakeDb(persistedInstances, persistedBookings);

    await persistPropagationChanges(fake.db, result, beforeInstances, beforeBookings, actorId);

    expect(fake.updateInstances).toHaveBeenCalledTimes(1);
    expect(fake.updateBookings).toHaveBeenCalledTimes(1);
    expect(fake.updateInstances.mock.calls[0]?.[0]).toMatchObject({
      where: { id: { in: beforeInstances.map((row) => row.id) } },
      data: { status: "cancelled", cancelReason: "Cambio de plantilla" },
    });
    expect(persistedInstances.every((row) => row.status === "cancelled")).toBe(true);
    expect(persistedBookings.every((row) =>
      row.status === "cancelled" && row.quotaReturned === true && row.cancelledBy === actorId,
    )).toBe(true);
    expect(persistedBookings.map((row) => row.pool)).toEqual(beforeBookings.map((row) => row.pool));
  });

  it("agrupa mudanzas por clase de destino y conserva el pool de cada reserva", async () => {
    const beforeInstances = [instance("source-a"), instance("source-b"), instance("target-a"), instance("target-b")];
    const beforeBookings = [
      booking("a-1", "source-a", { pool: "weekly_directed" }),
      booking("a-2", "source-a", { pool: "pack" }),
      booking("b-1", "source-b", { pool: "weekly_open" }),
      booking("b-2", "source-b", { pool: "pack" }),
    ];
    const result: PropagationResult = {
      instances: beforeInstances,
      bookings: beforeBookings.map((row) => ({
        ...row,
        instanceId: row.instanceId === "source-a" ? "target-a" : "target-b",
      })),
      summary: { cancelledClassCount: 0, cancelledBookingCount: 0, movedBookingCount: 4 },
    };
    const persistedInstances = beforeInstances.map((row) => ({ ...row }));
    const persistedBookings = beforeBookings.map((row) => ({ ...row }));
    const fake = fakeDb(persistedInstances, persistedBookings);

    await persistPropagationChanges(fake.db, result, beforeInstances, beforeBookings, actorId);

    expect(fake.updateInstances).not.toHaveBeenCalled();
    expect(fake.updateBookings).toHaveBeenCalledTimes(2);
    expect(persistedBookings.map((row) => row.instanceId)).toEqual([
      "target-a",
      "target-a",
      "target-b",
      "target-b",
    ]);
    expect(persistedBookings.map((row) => row.pool)).toEqual([
      "weekly_directed",
      "pack",
      "weekly_open",
      "pack",
    ]);
  });
});
