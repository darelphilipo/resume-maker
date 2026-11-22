import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

import { decodeBlock } from "./blockIds";
import { buildPackBlocks, getSectionPlans, planBlockKeys } from "./sectionPlans";

function experienceDoc(count: number) {
  const doc = createEmptyResume();
  doc.sections.experience.items = Array.from({ length: count }, (_, index) =>
    ExperienceItemSchema.parse({
      id: `e${index + 1}`,
      company: `Company ${index + 1}`,
      position: "Engineer",
    }),
  );
  return doc;
}

describe("getSectionPlans", () => {
  it("keeps a single-entry section atomic", () => {
    const [plan] = getSectionPlans(experienceDoc(1), ["experience"]);

    expect(plan).toMatchObject({
      sectionId: "experience",
      atomic: true,
      entryIds: [],
    });
    expect(planBlockKeys(plan)).toEqual(["experience"]);
  });

  it("plans one block per entry for a multi-entry section", () => {
    const [plan] = getSectionPlans(experienceDoc(3), ["experience"]);

    expect(plan).toMatchObject({
      sectionId: "experience",
      atomic: false,
      hasHeading: true,
      entryIds: ["e1", "e2", "e3"],
    });

    const keys = planBlockKeys(plan);
    expect(keys).toHaveLength(3);
    expect(decodeBlock(keys[0])).toMatchObject({
      entryIds: ["e1"],
      withHeading: true,
    });
    expect(decodeBlock(keys[1])).toMatchObject({
      entryIds: ["e2"],
      withHeading: false,
    });
    expect(decodeBlock(keys[2])).toMatchObject({
      entryIds: ["e3"],
      withHeading: false,
    });
  });

  it("groups consecutive same-company roles into one packing block", () => {
    const doc = createEmptyResume();
    doc.sections.experience.groupSameCompany = true;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({ id: "e1", company: "Acme" }),
      ExperienceItemSchema.parse({ id: "e2", company: "Acme" }),
      ExperienceItemSchema.parse({ id: "e3", company: "Globex" }),
    ];

    const [plan] = getSectionPlans(doc, ["experience"]);

    expect(plan.atomic).toBe(false);
    expect(plan.blocks).toEqual([["e1", "e2"], ["e3"]]);

    const keys = planBlockKeys(plan);

    expect(keys).toHaveLength(2);
    expect(decodeBlock(keys[0])).toMatchObject({
      entryIds: ["e1", "e2"],
      withHeading: true,
    });
    expect(decodeBlock(keys[1])).toMatchObject({
      entryIds: ["e3"],
      withHeading: false,
    });
  });

  it("keeps one block per entry when company grouping is off", () => {
    const [plan] = getSectionPlans(experienceDoc(3), ["experience"]);

    expect(plan.blocks).toBeUndefined();
    expect(planBlockKeys(plan)).toHaveLength(3);
  });

  it("keeps headings attached to the first entry when headings are hidden", () => {
    const doc = experienceDoc(2);
    doc.sections.experience.showHeading = false;
    const [plan] = getSectionPlans(doc, ["experience"]);

    expect(plan.hasHeading).toBe(false);
    expect(decodeBlock(planBlockKeys(plan)[0])).toMatchObject({
      withHeading: false,
    });
  });

  it("does not split keep-together, multi-column or summary sections", () => {
    const doc = experienceDoc(3);
    doc.sections.experience.keepTogether = true;
    doc.summary.content = "<p>A long summary paragraph.</p>";

    const [experience, summary] = getSectionPlans(doc, [
      "experience",
      "summary",
    ]);

    expect(experience.atomic).toBe(true);
    expect(summary.atomic).toBe(true);

    doc.sections.experience.keepTogether = false;
    doc.sections.experience.columns = 2;
    expect(getSectionPlans(doc, ["experience"])[0].atomic).toBe(true);
  });

  it("carries startOnNewPage onto the first entry block only", () => {
    const doc = experienceDoc(2);
    doc.sections.experience.startOnNewPage = true;
    const [plan] = getSectionPlans(doc, ["experience"]);

    const blocks = buildPackBlocks(
      [plan],
      {
        [planBlockKeys(plan)[0]]: 80,
        [planBlockKeys(plan)[1]]: 80,
      },
      new Set(["experience"]),
    );

    expect(blocks.map((block) => block.startOnNewPage)).toEqual([true, false]);
  });

  it("falls back to a whole-section height when entry heights are missing", () => {
    const [plan] = getSectionPlans(experienceDoc(3), ["experience"]);

    expect(buildPackBlocks([plan], { experience: 240 })).toEqual([
      { id: "experience", heightPx: 240, startOnNewPage: false },
    ]);
  });
});
