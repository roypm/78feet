import type { ScheduleTemplate } from "./template-draft";

const PREFIX = "78feet:template-draft:";

type StoredDraft = {
  baselineKey: string;
  value: ScheduleTemplate[];
};

function storageKey(boxId: string): string {
  return `${PREFIX}${boxId}`;
}

export function readPersistedTemplateWorking(
  boxId: string,
  baselineKey: string,
): ScheduleTemplate[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(boxId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (parsed.baselineKey !== baselineKey || !Array.isArray(parsed.value)) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function writePersistedTemplateWorking(
  boxId: string,
  baselineKey: string,
  value: ScheduleTemplate[],
): void {
  if (typeof window === "undefined") return;
  const payload: StoredDraft = { baselineKey, value };
  window.sessionStorage.setItem(storageKey(boxId), JSON.stringify(payload));
}

export function clearPersistedTemplateWorking(boxId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(boxId));
}
