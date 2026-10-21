import { describe, expect, it } from "vitest";

import { computePages, type ComputePagesInput } from "./computePages";

function makeInput(overrides: Partial<ComputePagesInput> = {}): ComputePagesInput {
  return {
    sectionIds: ["a", "b"],
    heights: { a: 500, b: 500 },
    headerHeightPx: 100,
    gapPx: 12,
    contentHeightPx: 1000,
    ...overrides,
  };
}

describe("computePages", () => {
  it("places the header first and packs the sections with gaps", () => {
    expect(computePages(makeInput()).pages).toEqual([
      ["__header", "a"],
      ["b"],
    ]);
  });

  it("gives an oversized header its own page", () => {
    const result = computePages(
      makeInput({
        headerHeightPx: 1000,
        heights: { a: 500, b: 480 },
      }),
    );

    expect(result.pages).toEqual([["__header"], ["a", "b"]]);
    expect(result.overflowPx).toBe(0);
  });

  it("returns a header-only page when there are no sections", () => {
    const result = computePages(
      makeInput({ sectionIds: [], heights: {} }),
    );

    expect(result.pages).toEqual([["__header"]]);
  });

  it("excludes zero-height sections and does not charge their gap", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["a", "b"],
        heights: { a: 500, b: 0 },
      }),
    );

    expect(result.pages).toEqual([["__header", "a"]]);
  });

  it("treats a missing section height as zero and excludes it", () => {
    const result = computePages(
      makeInput({ sectionIds: ["a", "b"], heights: {} }),
    );

    expect(result.pages).toEqual([["__header"]]);
  });

  it("keeps the header even when its height is zero", () => {
    const result = computePages(
      makeInput({
        headerHeightPx: 0,
        sectionIds: ["a", "b"],
        heights: { a: 100, b: 100 },
      }),
    );

    expect(result.pages).toEqual([["__header", "a", "b"]]);
  });

  it("forces a section onto a new page when configured", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["a"],
        heights: { a: 100 },
        startOnNewPage: new Set(["a"]),
      }),
    );

    expect(result.pages).toEqual([["__header"], ["a"]]);
  });
});
