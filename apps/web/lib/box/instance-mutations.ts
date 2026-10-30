import type { PatchInstance, CreateInstance } from "@78feet/domain";
import { api } from "./api";

export type InstanceEdit = Omit<PatchInstance, "confirmCapacity">;

export function patchInstance(instanceId: string, body: InstanceEdit, confirmCapacity = false) {
  return api<{ cancelledBookingCount: number }>(`/api/v1/admin/instances/${instanceId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...body, confirmCapacity }),
  });
}

export function createExtraInstance(body: CreateInstance) {
  return api<{ id: string }>("/api/v1/admin/instances", { method: "POST", body: JSON.stringify(body) });
}

export function instanceEditFromForm(form: FormData): InstanceEdit {
  const trainingId = String(form.get("trainingId") ?? "");
  return {
    startTime: String(form.get("startTime")),
    endTime: String(form.get("endTime")),
    classTypeId: String(form.get("classTypeId")),
    coachId: String(form.get("coachId") || "") || null,
    capacity: Number(form.get("capacity")),
    trainingId: trainingId.length > 0 ? trainingId : null,
  };
}
