import { templateConflicts } from "@78feet/domain";

export type ScheduleTemplate = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  kind: "directed" | "open";
  classTypeName: string;
  imageUrl: string;
  defaultCapacity: number;
  coachId: string | null;
};

export type TemplateSlotWrite = {
  weekday: number;
  startTime: string;
  endTime: string;
  classTypeId: string;
  coachId: string | null;
  defaultCapacity: number;
};

export function isPendingTemplateId(id: string): boolean {
  return id.startsWith("pending:");
}

export function newPendingTemplateId(): string {
  return `pending:${crypto.randomUUID()}`;
}

function clock5(value: string): string {
  return value.slice(0, 5);
}

export function slotEqual(left: ScheduleTemplate, right: ScheduleTemplate): boolean {
  return (
    left.id === right.id &&
    left.weekday === right.weekday &&
    clock5(left.startTime) === clock5(right.startTime) &&
    clock5(left.endTime) === clock5(right.endTime) &&
    left.classTypeId === right.classTypeId &&
    left.coachId === right.coachId &&
    left.defaultCapacity === right.defaultCapacity
  );
}

export function templatesSnapshot(templates: ScheduleTemplate[]): ScheduleTemplate[] {
  return templates.map((item) => ({ ...item }));
}

export function templatesEqual(left: ScheduleTemplate[], right: ScheduleTemplate[]): boolean {
  if (left.length !== right.length) return false;
  const byId = new Map(right.map((item) => [item.id, item]));
  return left.every((item) => {
    const other = byId.get(item.id);
    return other !== undefined && slotEqual(item, other);
  });
}

export type TemplateDraftDiff = {
  deletedIds: string[];
  created: ScheduleTemplate[];
  updated: ScheduleTemplate[];
};

export function diffTemplates(
  baseline: ScheduleTemplate[],
  working: ScheduleTemplate[],
): TemplateDraftDiff {
  const baseById = new Map(baseline.map((item) => [item.id, item]));
  const workById = new Map(working.map((item) => [item.id, item]));
  const deletedIds = baseline.filter((item) => !workById.has(item.id)).map((item) => item.id);
  const created = working.filter((item) => !baseById.has(item.id));
  const updated = working.filter((item) => {
    const before = baseById.get(item.id);
    return before !== undefined && !slotEqual(item, before);
  });
  return { deletedIds, created, updated };
}

export function localTemplateOverlap(
  candidate: TemplateSlotWrite & { id?: string; kind: ScheduleTemplate["kind"] },
  working: ScheduleTemplate[],
): boolean {
  const others = working
    .filter(
      (item) =>
        item.weekday === candidate.weekday && item.id !== candidate.id && item.kind === candidate.kind,
    )
    .map((item) => ({
      id: item.id,
      weekday: item.weekday,
      startTime: clock5(item.startTime),
      endTime: clock5(item.endTime),
      kind: item.kind,
      active: true as const,
    }));
  return templateConflicts(
    {
      id: candidate.id,
      weekday: candidate.weekday,
      startTime: clock5(candidate.startTime),
      endTime: clock5(candidate.endTime),
      kind: candidate.kind,
    },
    others,
  );
}
