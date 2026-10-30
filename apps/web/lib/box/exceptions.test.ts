import { describe, expect, it } from "vitest";
import { exceptionKindLabel, exceptionKinds, isCalendarException } from "./exceptions";

describe("exceptionKinds", () => {
  it("marks extras without template", () => {
    expect(exceptionKinds({ templateId: null, editedAt: new Date(), status: "scheduled" })).toEqual(["extra"]);
  });

  it("marks edited template instances", () => {
    expect(
      exceptionKinds({ templateId: "t1", editedAt: new Date(), status: "scheduled" }),
    ).toEqual(["modified"]);
  });

  it("marks cancelled instances", () => {
    expect(
      exceptionKinds({ templateId: "t1", editedAt: new Date(), status: "cancelled" }),
    ).toEqual(["modified", "cancelled"]);
  });

  it("labels kinds in Spanish", () => {
    expect(exceptionKindLabel("extra")).toBe("Clase extra");
    expect(exceptionKindLabel("modified")).toBe("Modificada");
    expect(exceptionKindLabel("cancelled")).toBe("Cancelada");
  });

  it("flags calendar exceptions", () => {
    expect(isCalendarException({ templateId: null, editedAt: new Date() })).toBe(true);
    expect(isCalendarException({ templateId: "t1", editedAt: new Date() })).toBe(true);
    expect(isCalendarException({ templateId: "t1", editedAt: null })).toBe(false);
  });
});
