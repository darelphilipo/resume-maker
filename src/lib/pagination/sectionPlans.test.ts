import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

import { decodeBlock, encodeEntryFragment } from "./blockIds";
import {
  buildPackBlocks,
  getSectionPlans,
  planBlockKeys,
  planFragmentKeys,
  planMeasureKeys,
} from "./sectionPlans";

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

const THREE_BULLETS =
  "<ul><li><p>One</p></li><li><p>Two</p></li><li><p>Three</p></li></ul>";

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

describe("bullet fragment plans", () => {
  it("measures bullets for a single tall entry while keeping it atomic", () => {
    const doc = experienceDoc(1);
    doc.sections.experience.items[0].summary = THREE_BULLETS;
    const [plan] = getSectionPlans(doc, ["experience"]);

    expect(plan.atomic).toBe(true);
    expect(planBlockKeys(plan)).toEqual(["experience"]);
    expect(planFragmentKeys(plan)).toHaveLength(3);
    expect(planMeasureKeys(plan)).toEqual(["experience", ...planFragmentKeys(plan)]);

    const fragments = planFragmentKeys(plan).map((key) => {
      const decoded = decodeBlock(key);

      expect(decoded.kind).toBe("section");
      return decoded.kind === "section" ? decoded : null;
    });

    expect(fragments[0]).toMatchObject({
      entryIds: ["e1"],
      withHeading: true,
      fragment: { entryId: "e1", start: 0, end: 0 },
    });
    expect(fragments[2]).toMatchObject({
      withHeading: false,
      fragment: { entryId: "e1", start: 2, end: 2 },
    });
  });

  it("only fuses the section heading to the first entry's first bullet", () => {
    const doc = experienceDoc(2);
    doc.sections.experience.items[0].summary = THREE_BULLETS;
    doc.sections.experience.items[1].summary = THREE_BULLETS;
    const [plan] = getSectionPlans(doc, ["experience"]);
    const fragments = plan.bulletFragments ?? [];

    expect(fragments).toHaveLength(2);
    expect(fragments[0].withHeading).toBe(true);
    expect(decodeBlock(fragments[0].keys[0])).toMatchObject({
      withHeading: true,
    });
    expect(fragments[1].withHeading).toBe(false);
    expect(
      fragments[1].keys.some((key) => {
        const decoded = decodeBlock(key);

        return decoded.kind === "section" && decoded.withHeading;
      }),
    ).toBe(false);
  });

  it("keeps grouped promotions and keep-together sections atomic", () => {
    const grouped = experienceDoc(2);
    grouped.sections.experience.items[0].summary = THREE_BULLETS;
    grouped.sections.experience.groupSameCompany = true;
    expect(getSectionPlans(grouped, ["experience"])[0].bulletFragments).toBeUndefined();

    const keepTogether = experienceDoc(1);
    keepTogether.sections.experience.items[0].summary = THREE_BULLETS;
    keepTogether.sections.experience.keepTogether = true;
    expect(
      getSectionPlans(keepTogether, ["experience"])[0].bulletFragments,
    ).toBeUndefined();

    const twoColumns = experienceDoc(1);
    twoColumns.sections.experience.items[0].summary = THREE_BULLETS;
    twoColumns.sections.experience.columns = 2;
    expect(
      getSectionPlans(twoColumns, ["experience"])[0].bulletFragments,
    ).toBeUndefined();
  });

  it("attaches measured fragments to the whole entry packing block", () => {
    const doc = experienceDoc(1);
    doc.sections.experience.items[0].summary = THREE_BULLETS;
    const [plan] = getSectionPlans(doc, ["experience"]);
    const keys = planFragmentKeys(plan);
    const heights = {
      experience: 900,
      [keys[0]]: 220,
      [keys[1]]: 340,
      [keys[2]]: 340,
    };

    const [block] = buildPackBlocks([plan], heights);

    expect(block.id).toBe("experience");
    expect(block.fragments?.map((fragment) => fragment.id)).toEqual(keys);
    expect(block.fragments?.map((fragment) => fragment.heightPx)).toEqual([
      220, 340, 340,
    ]);
  });

  it("does not attach a partial fragment list when a measurement is missing", () => {
    const doc = experienceDoc(1);
    doc.sections.experience.items[0].summary = THREE_BULLETS;
    const [plan] = getSectionPlans(doc, ["experience"]);
    const keys = planFragmentKeys(plan);

    const [block] = buildPackBlocks([plan], {
      experience: 900,
      [keys[0]]: 220,
      [keys[1]]: 340,
    });

    expect(block.fragments).toBeUndefined();
  });

  it("ignores an entry with a single bullet", () => {
    const doc = experienceDoc(1);
    doc.sections.experience.items[0].summary = "<ul><li>Only one</li></ul>";

    expect(getSectionPlans(doc, ["experience"])[0].bulletFragments).toBeUndefined();
  });

  it("encodes fragments through the shared helper", () => {
    expect(
      encodeEntryFragment("experience", "e1", false, 1, 1),
    ).toBe("__fragment:experience:e1:0:1:1");
  });
});
