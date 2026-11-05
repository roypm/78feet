import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTemplateDraft } from "./apply-template-draft";
import type { ScheduleTemplate } from "./template-draft";

const boxId = "11111111-1111-4111-8111-111111111111";
const slot: ScheduleTemplate = {
  id: "updated", weekday: 1, startTime: "09:00:00", endTime: "10:00:00",
  classTypeId: "type-1", kind: "directed", classTypeName: "WOD", imageUrl: "/image.png",
  defaultCapacity: 12, coachId: null,
};
const baseline = [slot, { ...slot, id: "deleted" }];
const working = [{ ...slot, defaultCapacity: 15 }, { ...slot, id: "pending:1", weekday: 2 }];

afterEach(() => vi.restoreAllMocks());

describe("applyTemplateDraft", () => {
  it("sends one apply-draft payload with deletes, updates and creates", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ summary: { cancelledClassCount: 1, cancelledBookingCount: 3, movedBookingCount: 3 } }),
    );

    await expect(applyTemplateDraft(baseline, working, boxId)).resolves.toEqual({
      cancelledClassCount: 1, cancelledBookingCount: 3, movedBookingCount: 3,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/admin/templates/apply-draft");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      boxId,
      deletedIds: ["deleted"],
      updated: [{
        id: "updated",
        weekday: 1,
        startTime: "09:00",
        endTime: "10:00",
        classTypeId: "type-1",
        coachId: null,
        defaultCapacity: 15,
      }],
      created: [{
        weekday: 2,
        startTime: "09:00",
        endTime: "10:00",
        classTypeId: "type-1",
        coachId: null,
        defaultCapacity: 12,
      }],
    });
  });

  it("surfaces API errors from the single apply-draft call", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ error: { code: "OVERLAP", message: "Horario solapado" } }, { status: 409 }),
    );
    await expect(applyTemplateDraft(baseline, working, boxId)).rejects.toMatchObject({
      code: "OVERLAP",
      message: "Horario solapado",
    });
  });

  it("does not send requests when the draft is unchanged", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    await expect(applyTemplateDraft(baseline, baseline, boxId)).resolves.toEqual({
      cancelledClassCount: 0, cancelledBookingCount: 0, movedBookingCount: 0,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
