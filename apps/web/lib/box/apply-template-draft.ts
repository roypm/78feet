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

export async function applyTemplateDraft(
  baseline: ScheduleTemplate[],
  working: ScheduleTemplate[],
  boxId?: string,
): Promise<Summary> {
  if (!boxId) throw new Error("Falta el box de la plantilla");
  const { deletedIds, created, updated } = diffTemplates(baseline, working);
  if (deletedIds.length + created.length + updated.length === 0) {
    return { cancelledClassCount: 0, cancelledBookingCount: 0, movedBookingCount: 0 };
  }
  const result = await api<{ summary: Summary }>("/api/v1/admin/templates/apply-draft", {
    method: "POST",
    body: JSON.stringify({
      boxId,
      deletedIds,
      updated: updated.map((slot) => ({ id: slot.id, ...slotBody(slot) })),
      created: created.map((slot) => slotBody(slot)),
    }),
  });
  return result.summary;
}
