import { describe, expect, it } from "vitest";
import { groupDayByKind, kindViewFromParam, viewKind } from "./day-groups";

describe("kind view from param", () => {
  it("opens on dirigidas unless the param says open", () => {
    expect(kindViewFromParam(undefined)).toBe("dirigidas");
    expect(kindViewFromParam("")).toBe("dirigidas");
    expect(kindViewFromParam("otro")).toBe("dirigidas");
    expect(kindViewFromParam("open")).toBe("open");
  });

  it("maps the view to the class kind", () => {
    expect(viewKind("dirigidas")).toBe("directed");
    expect(viewKind("open")).toBe("open");
  });
});

describe("group day by kind", () => {
  it("always returns dirigidas first and open second", () => {
    expect(groupDayByKind([]).map((group) => group.kind)).toEqual(["directed", "open"]);
  });

  it("splits the day and keeps the order of each group", () => {
    const groups = groupDayByKind([
      { id: "a", kind: "open" as const },
      { id: "b", kind: "directed" as const },
      { id: "c", kind: "open" as const },
      { id: "d", kind: "directed" as const },
    ]);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ["b", "d"],
      ["a", "c"],
    ]);
  });
});
