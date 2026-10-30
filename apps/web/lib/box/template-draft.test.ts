import { describe, expect, it } from "vitest";
import { diffTemplates, slotEqual, templatesEqual } from "./template-draft";

const base = {
  id: "a",
  weekday: 1,
  startTime: "09:00",
  endTime: "10:00",
  classTypeId: "t1",
  kind: "directed" as const,
  classTypeName: "WOD",
  imageUrl: "/wod.png",
  defaultCapacity: 12,
  coachId: null,
};

describe("template draft", () => {
  it("detects unchanged templates", () => {
    expect(templatesEqual([base], [{ ...base }])).toBe(true);
    expect(slotEqual(base, { ...base, startTime: "09:00:00" })).toBe(true);
  });

  it("diffs create, update and delete", () => {
    const working = [
      { ...base, defaultCapacity: 10 },
      {
        ...base,
        id: "pending:1",
        weekday: 2,
        startTime: "18:00",
        endTime: "19:00",
      },
    ];
    const baseline = [base, { ...base, id: "b", weekday: 3 }];
    const diff = diffTemplates(baseline, working);
    expect(diff.deletedIds).toEqual(["b"]);
    expect(diff.updated.map((item) => item.id)).toEqual(["a"]);
    expect(diff.created.map((item) => item.id)).toEqual(["pending:1"]);
  });
});
