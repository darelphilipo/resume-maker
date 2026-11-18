import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

import { computePages, type ComputePagesInput } from "./computePages";
import { getSectionPlans, planBlockKeys } from "./sectionPlans";

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

function splitExperience(count: number) {
  const doc = createEmptyResume();
  doc.sections.experience.items = Array.from({ length: count }, (_, index) =>
    ExperienceItemSchema.parse({
      id: `e${index + 1}`,
      company: `Company ${index + 1}`,
      position: "Engineer",
    }),
  );
  const plans = getSectionPlans(doc, ["experience"]);
  const keys = planBlockKeys(plans[0]);
  return {
    plans,
    keys,
    heights: Object.fromEntries(keys.map((key) => [key, 200])),
  };
}

describe("computePages with per-entry blocks", () => {
  it("fills Page 1 with entries before breaking instead of moving the whole section", () => {
    const { plans, keys, heights } = splitExperience(4);

    const result = computePages(
      makeInput({
        sectionIds: ["experience"],
        heights,
        headerHeightPx: 100,
        contentHeightPx: 800,
        gapPx: 0,
        plans,
      }),
    );

    expect(result.pages).toEqual([
      ["__header", keys[0], keys[1], keys[2]],
      [keys[3]],
    ]);
    expect(result.pages[0]).toHaveLength(4);
  });

  it("moves the heading with its first entry when it cannot fit", () => {
    const { plans, keys, heights } = splitExperience(2);

    const result = computePages(
      makeInput({
        sectionIds: ["experience"],
        heights,
        headerHeightPx: 700,
        contentHeightPx: 800,
        gapPx: 0,
        plans,
      }),
    );

    expect(result.pages).toEqual([
      ["__header"],
      [keys[0], keys[1]],
    ]);
    expect(result.pages[1][0]).toBe(keys[0]);
  });

  it("still reports overflow for an oversized block with plans supplied", () => {
    const { plans, keys } = splitExperience(1);
    const heights = { [keys[0]]: 230 };

    const result = computePages(
      makeInput({
        sectionIds: ["experience"],
        heights,
        headerHeightPx: 100,
        contentHeightPx: 200,
        gapPx: 0,
        plans,
      }),
    );

    expect(result.pages).toEqual([["__header"], [keys[0]]]);
    expect(result.overflowPx).toBeCloseTo(30);
  });
});
