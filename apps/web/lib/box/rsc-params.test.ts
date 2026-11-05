import { describe, expect, it } from "vitest";
import { calendarHref } from "./calendar-navigation";
import { canonicalBoxRedirect, type BoxSummary } from "./boxes";
import { pageNumber } from "./pagination";

const boxes: BoxSummary[] = [
  { id: "a", name: "Box 1" },
  { id: "b", name: "Box 2" },
];

describe("RSC list and box query params", () => {
  it("normalises invalid pagina values to page 1", () => {
    expect(pageNumber(undefined)).toBe(1);
    expect(pageNumber("0")).toBe(1);
    expect(pageNumber("abc")).toBe(1);
    expect(pageNumber("2")).toBe(2);
  });

  it("builds a canonical calendar URL when box is unknown", () => {
    const redirectTo = canonicalBoxRedirect(boxes, "missing", "b", (id) =>
      calendarHref("/calendario", "2026-11-03", "dirigidas", id),
    );
    expect(redirectTo).toBe("/calendario?box=b&semana=2026-11-03");
  });
});
