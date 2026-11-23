import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

import { encodeEntryBlock } from "./blockIds";
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

describe("computePages with sections pinned to Page 1", () => {
  it("anchors a trailing pinned sidebar block to Page 1", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["experience", "skills"],
        heights: { experience: 900, skills: 300 },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills"]),
      }),
    );

    // Page 2 would have rendered an empty main column once the template moved
    // Skills into Page 1's sidebar, so the blocks travel with the page.
    expect(result.pages).toEqual([
      ["__header", "experience", "skills"],
    ]);
    expect(result.overflowPx).toBe(0);
  });

  it("anchors pinned blocks to Page 1 while main overflow keeps its own page", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["experience", "projects", "skills"],
        heights: { experience: 900, projects: 300, skills: 300 },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills"]),
      }),
    );

    // Skills render in Page 1's side column, so Page 2 carries only the main
    // overflow and must not pay for the sidebar's height.
    expect(result.pages).toEqual([
      ["__header", "experience", "skills"],
      ["projects"],
    ]);
  });

  it("does not charge Page 1 sidebar blocks to Page 2's main-column budget", () => {
    // The canonical order interleaves sidebar sections between main ones, so
    // the old single-sequence packer pushed Awards onto an almost empty Page 3.
    const result = computePages(
      makeInput({
        sectionIds: [
          "experience",
          "education",
          "skills",
          "certifications",
          "awards",
        ],
        heights: {
          experience: 900,
          education: 500,
          skills: 250,
          certifications: 250,
          awards: 200,
        },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills", "certifications"]),
      }),
    );

    expect(result.pages).toEqual([
      ["__header", "experience", "skills", "certifications"],
      ["education", "awards"],
    ]);
    expect(result.overflowPx).toBe(0);
  });

  it("recognises split (entry-level) sidebar blocks", () => {
    const skillBlock = encodeEntryBlock("skills", "skill-1", true);

    const result = computePages(
      makeInput({
        sectionIds: ["experience", skillBlock],
        heights: { experience: 900, [skillBlock]: 300 },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills"]),
      }),
    );

    expect(result.pages).toEqual([
      ["__header", "experience", skillBlock],
    ]);
  });

  it("caps Page 1's sidebar at the page height and spills the rest to Page 2", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["experience", "skills", "certifications"],
        heights: { experience: 900, skills: 900, certifications: 900 },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills", "certifications"]),
      }),
    );

    // Skills fills Page 1's sidebar exactly; Certifications may not grow the
    // two-column grid past one printable page, so it joins the main flow.
    expect(result.pages).toEqual([
      ["__header", "experience", "skills"],
      ["certifications"],
    ]);
  });

  it("moves a sidebar block taller than Page 1 into the main flow", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["experience", "skills"],
        heights: { experience: 300, skills: 1200 },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills"]),
      }),
    );

    expect(result.pages).toEqual([
      ["__header", "experience"],
      ["skills"],
    ]);
  });

  it("sends sidebar overflow to Page 2 even when Page 1's main column has room", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["experience", "skills", "certifications"],
        heights: { experience: 300, skills: 900, certifications: 700 },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills", "certifications"]),
      }),
    );

    expect(result.pages).toEqual([
      ["__header", "experience", "skills"],
      ["certifications"],
    ]);
  });

  it("measures spilled sidebar blocks at full width so they fit Page 2", () => {
    const result = computePages(
      makeInput({
        sectionIds: ["experience", "projects", "skills", "certifications"],
        heights: {
          experience: 900,
          projects: 400,
          skills: 900,
          certifications: 700,
        },
        headerHeightPx: 100,
        gapPx: 0,
        contentHeightPx: 1000,
        pinnedToFirstPage: new Set(["skills", "certifications"]),
        // Certifications is only 700px tall in the narrow sidebar, but 500px
        // once it renders full-width beside Projects on Page 2.
        fullWidthHeights: { certifications: 500 },
      }),
    );

    // Without the full-width height, 400 + 700 would overflow onto Page 3.
    expect(result.pages).toEqual([
      ["__header", "experience", "skills"],
      ["projects", "certifications"],
    ]);
    expect(result.overflowPx).toBe(0);
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
