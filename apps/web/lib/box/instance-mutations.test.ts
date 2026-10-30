import { afterEach, describe, expect, it, vi } from "vitest";
import { createExtraInstance, instanceEditFromForm, patchInstance } from "./instance-mutations";

afterEach(() => vi.restoreAllMocks());

describe("instance mutations", () => {
  it("converts form values and clears optional coach and training selections", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      startTime: "09:00", endTime: "10:00", classTypeId: "type-1", capacity: "8", coachId: "", trainingId: "",
    })) form.set(key, value);
    expect(instanceEditFromForm(form)).toEqual({
      startTime: "09:00", endTime: "10:00", classTypeId: "type-1", capacity: 8, coachId: null, trainingId: null,
    });
    form.set("coachId", "coach-1");
    form.set("trainingId", "training-1");
    expect(instanceEditFromForm(form)).toMatchObject({ coachId: "coach-1", trainingId: "training-1" });
  });

  it("requires an explicit second request to confirm a capacity change", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: { code: "CONFIRM_REQUIRED", message: "Hay 12 reservas" } }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ cancelledBookingCount: 12 }));
    const body = { capacity: 8, trainingId: null };
    await expect(patchInstance("class-1", body)).rejects.toMatchObject({ code: "CONFIRM_REQUIRED", message: "Hay 12 reservas" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ ...body, confirmCapacity: false });
    await expect(patchInstance("class-1", body, true)).resolves.toEqual({ cancelledBookingCount: 12 });
    expect(fetch.mock.calls[1]?.[0]).toBe("/api/v1/admin/instances/class-1");
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetch.mock.calls[1]?.[1]?.body))).toEqual({ ...body, confirmCapacity: true });
    expect(body).toEqual({ capacity: 8, trainingId: null });
  });

  it.each(["cancelled", "scheduled"] as const)("sends status %s without automatic capacity confirmation", async (status) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ cancelledBookingCount: 0 }));
    await patchInstance("class-1", { status });
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ status, confirmCapacity: false });
  });

  it("creates an extra class through POST and returns its id for navigation", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "created-class" }));
    const body = { date: "2026-11-02", startTime: "18:00", endTime: "19:00", classTypeId: "type-1", coachId: null, capacity: 12 };
    await expect(createExtraInstance(body)).resolves.toEqual({ id: "created-class" });
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/v1/admin/instances");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual(body);
  });
});
