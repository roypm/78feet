import { describe, expect, it } from "vitest";
import { canonicalBoxRedirect, orderBoxes, pickBox, type BoxSummary } from "./boxes";

const boxes: BoxSummary[] = [
  { id: "a", name: "Box 1" },
  { id: "b", name: "Box 2" },
  { id: "c", name: "Box 3" },
];

describe("orderBoxes", () => {
  it("puts the preferred box first and keeps the rest in order", () => {
    expect(orderBoxes(boxes, "b").map((box) => box.id)).toEqual(["b", "a", "c"]);
    expect(orderBoxes(boxes, null).map((box) => box.id)).toEqual(["a", "b", "c"]);
    expect(orderBoxes(boxes, "missing").map((box) => box.id)).toEqual(["a", "b", "c"]);
  });
});

describe("pickBox", () => {
  it("honours the requested box in the URL", () => {
    expect(pickBox(boxes, "c", "b").id).toBe("c");
  });

  it("falls back to preference when there is no request", () => {
    expect(pickBox(boxes, undefined, "b").id).toBe("b");
  });

  it("falls back to the first box when preference is missing", () => {
    expect(pickBox(boxes, undefined, null).id).toBe("a");
  });
});

describe("canonicalBoxRedirect", () => {
  it("returns null when the request is missing or valid", () => {
    expect(canonicalBoxRedirect(boxes, undefined, "b", (id) => `/x?box=${id}`)).toBeNull();
    expect(canonicalBoxRedirect(boxes, "c", "b", (id) => `/x?box=${id}`)).toBeNull();
  });

  it("returns a canonical href when the request is unknown", () => {
    expect(canonicalBoxRedirect(boxes, "missing", "b", (id) => `/calendario?box=${id}`)).toBe(
      "/calendario?box=b",
    );
    expect(canonicalBoxRedirect(boxes, "missing", null, (id) => `/calendario?box=${id}`)).toBe(
      "/calendario?box=a",
    );
  });
});
