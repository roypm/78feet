import { describe, expect, it } from "vitest";
import { calendarHref } from "./calendar-navigation";

describe("calendar navigation", () => {
  it("opens the current directed calendar without redundant parameters", () => {
    expect(calendarHref("/calendario", undefined, "dirigidas")).toBe("/calendario");
  });

  it("keeps the selected week when changing between directed and open sessions", () => {
    expect(calendarHref("/calendario", "2026-11-02", "open")).toBe("/calendario?semana=2026-11-02&tipo=open");
    expect(calendarHref("/calendario", "2026-11-02", "dirigidas")).toBe("/calendario?semana=2026-11-02");
  });

  it("keeps staff navigation in its own module with the same filters", () => {
    expect(calendarHref("/staff/semana", "2026-11-09", "open")).toBe("/staff/semana?semana=2026-11-09&tipo=open");
    expect(calendarHref("/staff/semana", undefined, "open")).toBe("/staff/semana?tipo=open");
  });
});
