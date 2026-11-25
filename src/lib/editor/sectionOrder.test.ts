import { describe, expect, it } from "vitest";

import {
  dropTargetForPointer,
  mergeVisibleOrder,
  reorderVisibleIds,
} from "./sectionOrder";

describe("reorderVisibleIds", () => {
  it("moves a row down past the row it was dropped on", () => {
    expect(reorderVisibleIds(["a", "b", "c", "d"], "a", "c")).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  it("moves a row up past the row it was dropped on", () => {
    expect(reorderVisibleIds(["a", "b", "c", "d"], "d", "b")).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  it("returns an unchanged copy for a self-drop or unknown id", () => {
    expect(reorderVisibleIds(["a", "b"], "b", "b")).toEqual(["a", "b"]);
    expect(reorderVisibleIds(["a", "b"], "a", "missing")).toEqual(["a", "b"]);
    expect(reorderVisibleIds([], "a", "b")).toEqual([]);
  });
});

describe("mergeVisibleOrder", () => {
  const allIds = ["summary", "awards", "experience", "languages", "skills"];
  const tucked = new Set(["awards", "languages"]);

  it("keeps tucked rows in their saved slots", () => {
    expect(
      mergeVisibleOrder(allIds, tucked, ["skills", "summary", "experience"]),
    ).toEqual(["skills", "awards", "summary", "languages", "experience"]);
  });

  it("leaves the order alone when the visible order is unchanged", () => {
    expect(
      mergeVisibleOrder(allIds, tucked, ["summary", "experience", "skills"]),
    ).toEqual(allIds);
  });

  it("falls back to the original id if the visible order runs short", () => {
    expect(mergeVisibleOrder(["summary", "experience"], new Set(), [])).toEqual([
      "summary",
      "experience",
    ]);
  });
});

describe("dropTargetForPointer", () => {
  const slots = [
    { id: "a", top: 0, bottom: 44 },
    { id: "b", top: 48, bottom: 92 },
    { id: "c", top: 96, bottom: 140 },
  ];

  it("returns the first row whose midpoint is below the pointer", () => {
    expect(dropTargetForPointer(slots, 0)).toBe("a");
    expect(dropTargetForPointer(slots, 21)).toBe("a");
    expect(dropTargetForPointer(slots, 23)).toBe("b");
    expect(dropTargetForPointer(slots, 110)).toBe("c");
  });

  it("clamps past the last midpoint to the last row", () => {
    expect(dropTargetForPointer(slots, 500)).toBe("c");
  });

  it("returns null for an empty list", () => {
    expect(dropTargetForPointer([], 10)).toBeNull();
  });
});
