import { beforeEach, describe, expect, it } from "vitest";
import { atBoxTime } from "./time";
import {
  instanceConflicts,
  instanceKey,
  planMaterializedInstances,
  propagateTemplateChange,
  templateConflicts,
} from "./schedule";
import { makeBooking, makeInstance, makeTemplate, resetIds } from "./test/fixtures";
import type { ClassInstance } from "./types";

beforeEach(() => {
  resetIds();
});

function fromPlanned(planned: ReturnType<typeof planMaterializedInstances>[number], id: string): ClassInstance {
  return {
    id,
    templateId: planned.templateId,
    date: planned.date,
    startAt: planned.startAt,
    endAt: planned.endAt,
    classTypeId: planned.classTypeId,
    kind: planned.kind,
    trainingId: null,
    trainingClassTypeId: null,
    coachId: planned.coachId,
    capacity: planned.capacity,
    status: planned.status,
    editedAt: null,
  };
}

describe("schedule overlap", () => {
  it("allows directed and open templates on the same weekday at overlapping times", () => {
    const wod = makeTemplate({
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
    });
    const open = makeTemplate({
      weekday: 1,
      startTime: "18:30",
      endTime: "19:30",
      title: "Open",
      kind: "open",
    });
    expect(templateConflicts(open, [wod])).toBe(false);
  });

  it("rejects two templates of the same kind on the same weekday that overlap", () => {
    const first = makeTemplate({
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
    });
    const second = makeTemplate({
      weekday: 1,
      startTime: "18:30",
      endTime: "19:30",
      title: "Fuerza",
      kind: "directed",
    });
    expect(templateConflicts(second, [first])).toBe(true);
  });

  it("allows templates on the same weekday that only touch at the boundary", () => {
    const wod = makeTemplate({
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
    });
    const open = makeTemplate({
      weekday: 1,
      startTime: "19:00",
      endTime: "20:00",
      title: "Open",
      kind: "open",
    });
    expect(templateConflicts(open, [wod])).toBe(false);
  });

  it("allows directed and open instances on the same day at overlapping times", () => {
    const first = makeInstance({
      date: "2026-10-26",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-10-26", "18:00"),
      endAt: atBoxTime("2026-10-26", "19:00"),
    });
    const second = makeInstance({
      date: "2026-10-26",
      kind: "open",
      title: "Open",
      startAt: atBoxTime("2026-10-26", "18:45"),
      endAt: atBoxTime("2026-10-26", "19:45"),
    });
    expect(instanceConflicts(second, [first])).toBe(false);
  });

  it("rejects overlapping instances of the same kind on the same day", () => {
    const first = makeInstance({
      date: "2026-10-26",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-10-26", "18:00"),
      endAt: atBoxTime("2026-10-26", "19:00"),
    });
    const second = makeInstance({
      date: "2026-10-26",
      kind: "directed",
      title: "Fuerza",
      startAt: atBoxTime("2026-10-26", "18:45"),
      endAt: atBoxTime("2026-10-26", "19:45"),
    });
    expect(instanceConflicts(second, [first])).toBe(true);
  });
});

describe("idempotent materialization", () => {
  const template = makeTemplate({
    id: "tpl-wod",
    weekday: 1,
    startTime: "18:00",
    endTime: "19:00",
    title: "WOD",
    kind: "directed",
  });

  it("creates missing instances from today through the horizon", () => {
    const planned = planMaterializedInstances({
      templates: [template],
      existingKeys: new Set(),
      from: "2026-10-29",
      to: "2026-11-26",
    });
    const mondays = planned.map((instance) => instance.date);
    expect(mondays).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"]);
    expect(planned[0]?.startAt).toEqual(atBoxTime("2026-11-02", "18:00"));
  });

  it("does not create a second row for the same template and date", () => {
    const first = planMaterializedInstances({
      templates: [template],
      existingKeys: new Set(),
      from: "2026-10-26",
      to: "2026-11-23",
    });
    const keys = new Set(first.map((instance) => instanceKey(instance.templateId, instance.date)));
    const second = planMaterializedInstances({
      templates: [template],
      existingKeys: keys,
      from: "2026-10-26",
      to: "2026-11-23",
    });
    expect(second).toEqual([]);
  });

  it("still generates remaining days of the current week when the template is created mid-week", () => {
    const planned = planMaterializedInstances({
      templates: [template],
      existingKeys: new Set(),
      from: "2026-10-26",
      to: "2026-11-23",
    });
    expect(planned[0]?.date).toBe("2026-10-26");
  });
});

describe("template change from next Monday", () => {
  it("leaves the current week untouched and cancels future classes when the template is deleted", () => {
    const template = makeTemplate({
      id: "tpl-wod",
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
    });
    const thisWeek = makeInstance({
      id: "inst-this",
      templateId: template.id,
      date: "2026-10-26",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-10-26", "18:00"),
      endAt: atBoxTime("2026-10-26", "19:00"),
    });
    const nextWeek = makeInstance({
      id: "inst-next",
      templateId: template.id,
      date: "2026-11-02",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-11-02", "18:00"),
      endAt: atBoxTime("2026-11-02", "19:00"),
    });
    const bookings = [
      makeBooking({ instanceId: thisWeek.id, userId: "a", pool: "weekly_directed" }),
      makeBooking({ instanceId: nextWeek.id, userId: "b", pool: "weekly_directed" }),
    ];

    const result = propagateTemplateChange({
      today: "2026-10-29",
      templateId: template.id,
      change: { type: "delete" },
      instances: [thisWeek, nextWeek],
      bookings,
    });

    const kept = result.instances.find((instance) => instance.id === thisWeek.id);
    const gone = result.instances.find((instance) => instance.id === nextWeek.id);
    expect(kept?.status).toBe("scheduled");
    expect(gone?.status).toBe("cancelled");
    expect(result.bookings.find((booking) => booking.instanceId === thisWeek.id)?.status).toBe("active");
    expect(result.bookings.find((booking) => booking.instanceId === nextWeek.id)).toMatchObject({
      status: "cancelled",
      quotaReturned: true,
    });
    expect(result.summary).toEqual({
      cancelledClassCount: 1,
      cancelledBookingCount: 1,
      movedBookingCount: 0,
    });
  });

  it("keeps bookings when only the coach or capacity goes up", () => {
    const template = makeTemplate({
      id: "tpl-wod",
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
      coachId: "coach-2",
      defaultCapacity: 16,
    });
    const nextWeek = makeInstance({
      id: "inst-next",
      templateId: template.id,
      date: "2026-11-02",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-11-02", "18:00"),
      endAt: atBoxTime("2026-11-02", "19:00"),
      capacity: 12,
      coachId: "coach-1",
    });
    const bookings = [makeBooking({ instanceId: nextWeek.id, userId: "a", pool: "weekly_directed" })];
    const result = propagateTemplateChange({
      today: "2026-10-29",
      templateId: template.id,
      change: { type: "update", template },
      instances: [nextWeek],
      bookings,
    });
    expect(result.bookings[0]?.status).toBe("active");
    expect(result.instances[0]).toMatchObject({
      coachId: "coach-2",
      capacity: 16,
      status: "scheduled",
    });
    expect(result.summary.cancelledBookingCount).toBe(0);
  });

  it("cancels every booking if the new capacity is below the roster", () => {
    const template = makeTemplate({
      id: "tpl-wod",
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
      defaultCapacity: 1,
    });
    const nextWeek = makeInstance({
      id: "inst-next",
      templateId: template.id,
      date: "2026-11-02",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-11-02", "18:00"),
      endAt: atBoxTime("2026-11-02", "19:00"),
      capacity: 12,
    });
    const bookings = [
      makeBooking({ instanceId: nextWeek.id, userId: "a", pool: "weekly_directed" }),
      makeBooking({ instanceId: nextWeek.id, userId: "b", pool: "weekly_directed" }),
    ];
    const result = propagateTemplateChange({
      today: "2026-10-29",
      templateId: template.id,
      change: { type: "update", template },
      instances: [nextWeek],
      bookings,
    });
    expect(result.bookings.every((booking) => booking.status === "cancelled")).toBe(true);
    expect(result.bookings.every((booking) => booking.quotaReturned === true)).toBe(true);
    expect(result.instances[0]?.capacity).toBe(1);
    expect(result.summary.cancelledBookingCount).toBe(2);
  });

  it("moves bookings to an identical successor instead of cancelling them", () => {
    const closing = makeTemplate({
      id: "tpl-old",
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
    });
    const replacement = makeTemplate({
      id: "tpl-new",
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      title: "WOD",
      kind: "directed",
      defaultCapacity: 12,
    });
    const oldInstance = makeInstance({
      id: "inst-old",
      templateId: closing.id,
      date: "2026-11-02",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-11-02", "18:00"),
      endAt: atBoxTime("2026-11-02", "19:00"),
    });
    const successor = fromPlanned(
      planMaterializedInstances({
        templates: [replacement],
        existingKeys: new Set(),
        from: "2026-11-02",
        to: "2026-11-02",
      })[0]!,
      "inst-new",
    );
    const bookings = [
      makeBooking({ instanceId: oldInstance.id, userId: "a", pool: "weekly_directed" }),
      makeBooking({ instanceId: oldInstance.id, userId: "b", pool: "pack" }),
    ];
    const result = propagateTemplateChange({
      today: "2026-10-29",
      templateId: closing.id,
      change: { type: "delete" },
      instances: [oldInstance, successor],
      bookings,
    });
    expect(result.instances.find((instance) => instance.id === oldInstance.id)?.status).toBe("cancelled");
    expect(result.bookings.map((booking) => booking.instanceId)).toEqual(["inst-new", "inst-new"]);
    expect(result.bookings.every((booking) => booking.status === "active")).toBe(true);
    expect(result.bookings.map((booking) => booking.pool)).toEqual(["weekly_directed", "pack"]);
    expect(result.summary.movedBookingCount).toBe(2);
    expect(result.summary.cancelledBookingCount).toBe(0);
  });

  it("does not overwrite an exception", () => {
    const template = makeTemplate({
      id: "tpl-wod",
      weekday: 1,
      startTime: "19:00",
      endTime: "20:00",
      title: "WOD",
      kind: "directed",
    });
    const exception = makeInstance({
      id: "inst-ex",
      templateId: template.id,
      date: "2026-11-02",
      kind: "directed",
      title: "WOD",
      startAt: atBoxTime("2026-11-02", "18:00"),
      endAt: atBoxTime("2026-11-02", "19:00"),
      editedAt: atBoxTime("2026-10-28", "10:00"),
    });
    const result = propagateTemplateChange({
      today: "2026-10-29",
      templateId: template.id,
      change: { type: "update", template },
      instances: [exception],
      bookings: [],
    });
    expect(result.instances[0]?.startAt).toEqual(atBoxTime("2026-11-02", "18:00"));
    expect(result.instances[0]?.status).toBe("scheduled");
  });

  it("cancels bookings when the class type of the slot changes", () => {
    const template = makeTemplate({
      id: "tpl-wod",
      weekday: 1,
      startTime: "18:00",
      endTime: "19:00",
      kind: "directed",
      classTypeId: "type-endurance",
    });
    const nextWeek = makeInstance({
      id: "inst-next",
      templateId: template.id,
      date: "2026-11-02",
      kind: "directed",
      classTypeId: "type-wod",
      trainingId: "tr-1",
      trainingClassTypeId: "type-wod",
      startAt: atBoxTime("2026-11-02", "18:00"),
      endAt: atBoxTime("2026-11-02", "19:00"),
    });
    const bookings = [makeBooking({ instanceId: nextWeek.id, userId: "a", pool: "weekly_directed" })];
    const result = propagateTemplateChange({
      today: "2026-10-29",
      templateId: template.id,
      change: { type: "update", template },
      instances: [nextWeek],
      bookings,
    });
    expect(result.bookings[0]).toMatchObject({ status: "cancelled", quotaReturned: true });
    expect(result.instances[0]).toMatchObject({
      classTypeId: "type-endurance",
      trainingId: null,
    });
  });
});
