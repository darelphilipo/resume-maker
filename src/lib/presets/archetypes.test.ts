import { describe, expect, it } from "vitest";

import { ResumeDocumentSchema } from "@/lib/schema/resume.schema";

import { ARCHETYPES, buildArchetype } from "./archetypes";

const DATE_PATTERN = /^\d{4}-\d{2}$/;

function bulletLines(html: string): string[] {
  return [...html.matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1]);
}

describe("ARCHETYPES", () => {
  it("defines exactly the five approved archetypes", () => {
    expect(ARCHETYPES.map((archetype) => archetype.id)).toEqual([
      "software-engineer",
      "product-manager",
      "ux-ui-designer",
      "finance-operations",
      "fresh-graduate",
    ]);
    expect(ARCHETYPES.map((archetype) => archetype.label)).toEqual([
      "Software Engineer",
      "Product Manager",
      "UX/UI Designer",
      "Finance & Operations",
      "Fresh Graduate",
    ]);
  });

  it.each(ARCHETYPES.map((archetype) => [archetype.id, archetype] as const))(
    "%s builds a schema-valid document",
    (_id, archetype) => {
      const doc = archetype.build();

      expect(() => ResumeDocumentSchema.parse(doc)).not.toThrow();
      expect(doc.metadata.template).toBe("onyx");
      expect(doc.metadata.layout.pages[0].main).toEqual([
        "summary",
        "profiles",
        "experience",
        "projects",
        "education",
        "skills",
        "certifications",
        "awards",
        "languages",
        "interests",
        "volunteer",
        "publications",
        "references",
      ]);
      expect(doc.basics.name.trim()).not.toBe("");
      expect(doc.basics.headline.trim()).not.toBe("");
      expect(doc.basics.email).toContain("@");
      expect(doc.basics.phone.trim()).not.toBe("");
      expect(doc.basics.location.trim()).not.toBe("");
      expect(doc.basics.website.url.trim()).not.toBe("");
      expect(doc.basics.website.label.trim()).not.toBe("");
      expect(doc.summary.content).toMatch(/^<p>.+<\/p>$/);
      expect(doc.sections.experience.items).toHaveLength(2);
      expect(doc.sections.education.items).toHaveLength(1);
      expect(doc.sections.skills.items).toHaveLength(6);
      expect(doc.sections.projects.items.length).toBeGreaterThanOrEqual(1);
      expect(doc.sections.projects.items.length).toBeLessThanOrEqual(2);
    },
  );

  it.each(ARCHETYPES.map((archetype) => [archetype.id, archetype] as const))(
    "%s uses quantified XYZ bullets and valid start dates",
    (_id, archetype) => {
      const doc = archetype.build();
      const htmlBlocks = [
        ...doc.sections.experience.items.map((item) => item.summary),
        ...doc.sections.projects.items.map((item) => item.description),
      ];

      for (const html of htmlBlocks) {
        const lines = bulletLines(html);

        expect(lines.length).toBeGreaterThanOrEqual(3);

        for (const line of lines) {
          expect(line).toMatch(/\d/);
        }
      }

      for (const item of doc.sections.experience.items) {
        expect(item.startDate).toMatch(DATE_PATTERN);
        expect(item.endDate).toMatch(DATE_PATTERN);
      }

      for (const item of doc.sections.education.items) {
        expect(item.startDate).toMatch(DATE_PATTERN);
        expect(item.endDate).toMatch(DATE_PATTERN);
      }

      for (const item of doc.sections.projects.items) {
        expect(item.startDate).toMatch(DATE_PATTERN);
        expect(item.endDate).toMatch(DATE_PATTERN);
      }

      for (const skill of doc.sections.skills.items) {
        expect(skill.level).toBeGreaterThanOrEqual(3);
        expect(skill.level).toBeLessThanOrEqual(5);
      }
    },
  );

  it("gives the fresh graduate early-career roles instead of senior titles", () => {
    const doc = buildArchetype("fresh-graduate");
    expect(doc).not.toBeNull();

    for (const item of doc!.sections.experience.items) {
      expect(item.position).not.toMatch(
        /\b(senior|lead|principal|staff|director|head|chief)\b/i,
      );
    }
  });

  it("returns null for an unknown archetype", () => {
    expect(buildArchetype("astronaut")).toBeNull();
  });
});
