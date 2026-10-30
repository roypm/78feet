import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTemplateDraft } from "./apply-template-draft";
import type { ScheduleTemplate } from "./template-draft";

const slot: ScheduleTemplate = {
  id: "updated", weekday: 1, startTime: "09:00:00", endTime: "10:00:00",
  classTypeId: "type-1", kind: "directed", classTypeName: "WOD", imageUrl: "/image.png",
  defaultCapacity: 12, coachId: null,
};
const baseline = [slot, { ...slot, id: "deleted" }];
const working = [{ ...slot, defaultCapacity: 15 }, { ...slot, id: "pending:1", weekday: 2 }];

afterEach(() => vi.restoreAllMocks());

describe("applyTemplateDraft", () => {
  it("deletes, updates and creates in sequence using write payloads, and merges impact totals", async () => {
    let resolveDelete!: (response: Response) => void;
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveDelete = resolve; }))
      .mockResolvedValueOnce(Response.json({ summary: { cancelledClassCount: 0, cancelledBookingCount: 1, movedBookingCount: 3 } }))
      .mockResolvedValueOnce(Response.json({}));

    const saving = applyTemplateDraft(baseline, working);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/admin/templates/deleted");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    resolveDelete(Response.json({ summary: { cancelledClassCount: 1, cancelledBookingCount: 2, movedBookingCount: 0 } }));

    await expect(saving).resolves.toEqual({ cancelledClassCount: 1, cancelledBookingCount: 3, movedBookingCount: 3 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1]?.[0]).toBe("/api/v1/admin/templates/updated");
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({
      weekday: 1, startTime: "09:00", endTime: "10:00", classTypeId: "type-1", coachId: null, defaultCapacity: 15,
    });
    expect(fetch.mock.calls[2]?.[0]).toBe("/api/v1/admin/templates");
    expect(fetch.mock.calls[2]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetch.mock.calls[2]?.[1]?.body)).weekday).toBe(2);
  });

  it("stops later writes and exposes the API error when a change fails", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ summary: { cancelledClassCount: 1, cancelledBookingCount: 0, movedBookingCount: 0 } }))
      .mockResolvedValueOnce(Response.json({ error: { code: "OVERLAP", message: "Horario solapado" } }, { status: 409 }));
    await expect(applyTemplateDraft(baseline, working)).rejects.toMatchObject({ code: "OVERLAP", message: "Horario solapado" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not send requests when the draft is unchanged", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    await expect(applyTemplateDraft(baseline, baseline)).resolves.toEqual({
      cancelledClassCount: 0, cancelledBookingCount: 0, movedBookingCount: 0,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
