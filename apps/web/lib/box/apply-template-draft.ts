import type { PropagationSummary as Summary } from "@78feet/domain";
import { api } from "./api";
import { diffTemplates, type ScheduleTemplate, type TemplateSlotWrite } from "./template-draft";

export function summaryMessage(summary: Summary): string {
  const changes = [
    summary.cancelledClassCount ? `${summary.cancelledClassCount} clases canceladas` : null,
    summary.cancelledBookingCount ? `${summary.cancelledBookingCount} reservas canceladas` : null,
    summary.movedBookingCount ? `${summary.movedBookingCount} reservas movidas` : null,
  ].filter((item): item is string => item !== null);

  return changes.length ? `Plantilla actualizada. ${changes.join(" · ")}.` : "Plantilla actualizada.";
}

function mergeSummary(left: Summary, right: Summary): Summary {
  return {
    cancelledClassCount: left.cancelledClassCount + right.cancelledClassCount,
    cancelledBookingCount: left.cancelledBookingCount + right.cancelledBookingCount,
    movedBookingCount: left.movedBookingCount + right.movedBookingCount,
  };
}

function slotBody(slot: TemplateSlotWrite) {
  return {
    weekday: slot.weekday,
    startTime: slot.startTime.slice(0, 5),
    endTime: slot.endTime.slice(0, 5),
    classTypeId: slot.classTypeId,
    coachId: slot.coachId,
    defaultCapacity: slot.defaultCapacity,
  };
}

export async function applyTemplateDraft(baseline: ScheduleTemplate[], working: ScheduleTemplate[]): Promise<Summary> {
  const { deletedIds, created, updated } = diffTemplates(baseline, working);
  let summary: Summary = { cancelledClassCount: 0, cancelledBookingCount: 0, movedBookingCount: 0 };
  for (const id of deletedIds) {
    const result = await api<{ summary: Summary }>(`/api/v1/admin/templates/${id}`, { method: "DELETE" });
    summary = mergeSummary(summary, result.summary);
  }
  for (const slot of updated) {
    const result = await api<{ summary: Summary }>(`/api/v1/admin/templates/${slot.id}`, {
      method: "PATCH",
      body: JSON.stringify(slotBody(slot)),
    });
    summary = mergeSummary(summary, result.summary);
  }
  for (const slot of created) {
    await api("/api/v1/admin/templates", { method: "POST", body: JSON.stringify(slotBody(slot)) });
  }
  return summary;
}
