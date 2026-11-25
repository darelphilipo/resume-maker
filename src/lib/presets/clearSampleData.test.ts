import { describe, expect, it } from "vitest";

import { buildAtsText } from "@/lib/ats/atsText";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  CustomSectionSchema,
  SECTION_IDS,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";
import { buildArchetype } from "./archetypes";
import { clearSampleData } from "./clearSampleData";

describe("clearSampleData", () => {
  it("leaves documents that are not starter samples untouched", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    doc.sections.experience.items.push({
      id: "role-1",
      hidden: false,
      company: "Analytical Engines",
      position: "Engineer",
      location: "London",
      startDate: "1843-01",
      endDate: "",
      current: true,
      summary: "<ul><li>Built the first algorithm</li></ul>",
    });

    expect(clearSampleData(doc)).toBe(doc);
  });

  it("wipes sample content but keeps the document shape", () => {
    const doc = buildArchetype("software-engineer") as ResumeDocument;
    doc.sections.experience.title = "Work history";
    doc.sections.awards.hidden = true;
    doc.customSections = [
      CustomSectionSchema.parse({
        id: "custom-speaking",
        title: "Speaking",
        items: [
          {
            id: "talk-1",
            hidden: false,
            name: "Sample talk",
            description: "<p>Sample abstract</p>",
          },
        ],
      }),
    ];

    const cleared = clearSampleData(doc);

    expect(cleared).not.toBe(doc);
    expect(doc.metadata.sampleData).toBe(true); // the source is never mutated
    expect(cleared.metadata.sampleData).toBe(false);
    expect(cleared.metadata.template).toBe(doc.metadata.template);
    expect(cleared.metadata.layout).toEqual(doc.metadata.layout);
    expect(cleared.basics).toEqual(createEmptyResume().basics);
    expect(cleared.summary.content).toBe("");
    expect(cleared.summary.title).toBe(doc.summary.title);

    for (const id of SECTION_IDS) {
      expect(cleared.sections[id].items).toEqual([]);
      expect(cleared.sections[id].title).toBe(doc.sections[id].title);
      expect(cleared.sections[id].hidden).toBe(doc.sections[id].hidden);
    }

    expect(cleared.sections.experience.title).toBe("Work history");
    expect(cleared.sections.awards.hidden).toBe(true);
    expect(cleared.customSections).toHaveLength(1);
    expect(cleared.customSections[0].items).toEqual([]);
    expect(cleared.customSections[0].title).toBe("Speaking");
  });

  it("removes the sample name and bullets from ATS text", () => {
    const doc = buildArchetype("product-manager") as ResumeDocument;

    expect(buildAtsText(doc)).toContain("Jordan Alvarez");

    const ats = buildAtsText(clearSampleData(doc));

    expect(ats).not.toContain("Jordan Alvarez");
    expect(ats).not.toContain("Helio Commerce");
    expect(ats).not.toContain("Roadmapping");
  });
});
