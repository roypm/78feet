"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clockToMinutes, isWithinOpeningIntervals, type BoxHoursConfig } from "@78feet/domain";
import { toast } from "sonner";
import { applyTemplateDraft, summaryMessage } from "@/lib/box/apply-template-draft";
import { localTemplateOverlap, newPendingTemplateId, templatesEqual, templatesSnapshot, type ScheduleTemplate, type TemplateSlotWrite } from "@/lib/box/template-draft";
import type { Draft, TemplateKind, ClassType } from "./shared";

function minutesToClock(minutes: number): string {
  const safe = Math.max(0, Math.min(23 * 60 + 45, minutes));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function useTemplateDraft({ templates, types, openingHours }: {
  templates: ScheduleTemplate[]; types: ClassType[]; openingHours: BoxHoursConfig;
}) {
  const router = useRouter();
  const baseline = useMemo(() => templatesSnapshot(templates), [templates]);
  const baselineKey = JSON.stringify(baseline);
  const [workingState, setWorkingState] = useState(() => ({
    baselineKey,
    value: templatesSnapshot(templates),
  }));
  const working = workingState.baselineKey === baselineKey ? workingState.value : baseline;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const editorKey = useRef(0);

  function setWorking(next: ScheduleTemplate[] | ((current: ScheduleTemplate[]) => ScheduleTemplate[])) {
    setWorkingState((previous) => {
      const current = previous.baselineKey === baselineKey ? previous.value : baseline;
      return {
        baselineKey,
        value: typeof next === "function" ? next(current) : next,
      };
    });
  }

  const isDirty = !templatesEqual(baseline, working);
  function startCreate(weekday: number, kind: TemplateKind, requestedStart?: number) {
    const typesForKind = types.filter((item) => item.kind === kind);
    let start = Math.min(22 * 60 + 45, Math.max(0, Math.round((requestedStart ?? 18 * 60) / 15) * 15));
    const intervals = openingHours.weekly.find((day) => day.weekday === weekday)?.intervals ?? [];
    const fits = (minute: number) =>
      intervals.some((interval) => clockToMinutes(interval.openTime) <= minute && minute + 60 <= clockToMinutes(interval.closeTime));
    if (!fits(start) && requestedStart === undefined) {
      const firstUsable = intervals.find((interval) => clockToMinutes(interval.closeTime) - clockToMinutes(interval.openTime) >= 60);
      if (!firstUsable) {
        toast.error("Ese día no tiene un tramo abierto suficiente para una clase");
        return;
      }
      start = clockToMinutes(firstUsable.openTime);
    }
    if (!fits(start)) {
      toast.error("No hay una hora abierta suficiente para una clase en ese tramo");
      return;
    }
    const end = start + 60;
    setDraft({
      key: ++editorKey.current,
      kind,
      weekday,
      startTime: minutesToClock(start),
      endTime: minutesToClock(end),
      classTypeId: typesForKind[0]?.id ?? "",
      coachId: null,
      defaultCapacity: 12,
    });
  }

  function startEdit(template: ScheduleTemplate) {
    setDraft({
      key: ++editorKey.current,
      kind: template.kind,
      template,
      weekday: template.weekday,
      startTime: template.startTime.slice(0, 5),
      endTime: template.endTime.slice(0, 5),
      classTypeId: template.classTypeId,
      coachId: template.coachId,
      defaultCapacity: template.defaultCapacity,
    });
  }

  function cancelDraftChanges() {
    setWorking(templatesSnapshot(baseline));
    setDraft(null);
    toast.message("Cambios descartados");
  }

  function commitSlot(slot: TemplateSlotWrite, existing?: ScheduleTemplate) {
    const type = types.find((item) => item.id === slot.classTypeId);
    if (!type) {
      toast.error("Elegí un tipo de clase");
      return;
    }
    const opening = openingHours.weekly.find((day) => day.weekday === slot.weekday)?.intervals ?? [];
    if (!isWithinOpeningIntervals(opening, slot.startTime, slot.endTime)) {
      toast.error("La clase tiene que quedar dentro del horario abierto de ese día");
      return;
    }
    const id = existing?.id ?? newPendingTemplateId();
    if (
      localTemplateOverlap(
        { ...slot, id, kind: type.kind },
        working.filter((item) => item.id !== id),
      )
    ) {
      const lane = type.kind === "open" ? "open" : "clase dirigida";
      toast.error(`Esa hora se solapa con otro ${lane} del mismo día`);
      return;
    }
    const next: ScheduleTemplate = {
      id,
      weekday: slot.weekday,
      startTime: slot.startTime.slice(0, 5),
      endTime: slot.endTime.slice(0, 5),
      classTypeId: slot.classTypeId,
      kind: type.kind,
      classTypeName: type.name,
      imageUrl: type.imageUrl,
      defaultCapacity: slot.defaultCapacity,
      coachId: slot.coachId,
    };
    setWorking((prev) => [...prev.filter((item) => item.id !== id), next]);
    setDraft(null);
  }

  function removeSlot(id: string) {
    setWorking((prev) => prev.filter((item) => item.id !== id));
    setDraft(null);
  }

  async function applyTemplate() {
    setApplying(true);
    try {
      const summary = await applyTemplateDraft(baseline, working);
      toast.success(summaryMessage(summary));
      setApplyOpen(false);
      setDraft(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aplicar la plantilla");
    } finally {
      setApplying(false);
    }
  }

  return {
    working, isDirty, draft, setDraft, applyOpen, setApplyOpen, applying,
    startCreate, startEdit, cancelDraftChanges, commitSlot, removeSlot, applyTemplate,
  };
}
