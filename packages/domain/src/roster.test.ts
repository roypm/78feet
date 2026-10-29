import { describe, expect, it } from "vitest";
import { rosterName } from "./roster";

describe("rosterName", () => {
  it("shows first name and the initial of the last name", () => {
    expect(rosterName("Marta", "García")).toBe("Marta G.");
  });
});
