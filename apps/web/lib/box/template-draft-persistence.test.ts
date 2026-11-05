import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPersistedTemplateWorking,
  readPersistedTemplateWorking,
  writePersistedTemplateWorking,
} from "./template-draft-persistence";
import type { ScheduleTemplate } from "./template-draft";

const slot: ScheduleTemplate = {
  id: "a",
  weekday: 1,
  startTime: "09:00",
  endTime: "10:00",
  classTypeId: "t1",
  kind: "directed",
  classTypeName: "WOD",
  imageUrl: null,
  defaultCapacity: 12,
  coachId: null,
};

describe("template draft persistence", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
  });

  it("round-trips a working draft for a box", () => {
    const key = JSON.stringify([slot]);
    writePersistedTemplateWorking("box-1", key, [slot, { ...slot, id: "pending:1", weekday: 2 }]);
    expect(readPersistedTemplateWorking("box-1", key)).toHaveLength(2);
    expect(readPersistedTemplateWorking("box-2", key)).toBeNull();
    expect(readPersistedTemplateWorking("box-1", "other")).toBeNull();
  });

  it("clears stored draft", () => {
    const key = JSON.stringify([slot]);
    writePersistedTemplateWorking("box-1", key, [slot]);
    clearPersistedTemplateWorking("box-1");
    expect(readPersistedTemplateWorking("box-1", key)).toBeNull();
  });
});
