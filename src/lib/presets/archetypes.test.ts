import { describe, expect, it } from "vitest";

import { buildAtsText } from "@/lib/ats/atsText";
import { ResumeDocumentSchema } from "@/lib/schema/resume.schema";

import { ARCHETYPES, buildArchetype } from "./archetypes";

const DATE_PATTERN = /^\d{4}-\d{2}$/;

function bulletLines(html: string): string[] {
  return [...html.matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1]);
}

describe("ARCHETYPES", () => {
  it("defines exactly the six approved archetypes", () => {
    expect(ARCHETYPES.map((archetype) => archetype.id)).toEqual([
      "software-engineer",
      "product-manager",
      "ux-ui-designer",
      "finance-operations",
      "data-analyst",
      "fresh-graduate",
    ]);
    expect(ARCHETYPES.map((archetype) => archetype.label)).toEqual([
      "Software Engineer",
      "Product Manager",
      "UX/UI Designer",
      "Finance & Operations",
      "Data Analyst",
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
      expect(doc.sections.skills.items).toHaveLength(3);
      expect(doc.sections.projects.items.length).toBeGreaterThanOrEqual(1);
      expect(doc.sections.projects.items.length).toBeLessThanOrEqual(2);
    },
  );

  it.each(ARCHETYPES.map((archetype) => [archetype.id, archetype] as const))(
    "%s groups skills into three keyword categories",
    (_id, archetype) => {
      const doc = archetype.build();
      const categories = doc.sections.skills.items;

      expect(categories).toHaveLength(3);
      expect(new Set(categories.map((category) => category.name)).size).toBe(3);

      for (const category of categories) {
        expect(category.name.trim()).not.toBe("");
        expect(category.hidden).toBe(false);
        expect(category.level).toBe(0);
        expect(category.keywords.length).toBeGreaterThanOrEqual(2);

        for (const keyword of category.keywords) {
          expect(keyword.trim()).toBe(keyword);
          expect(keyword).not.toBe("");
        }
      }
    },
  );

  it("prints sample skills as category headings with comma-separated keywords", () => {
    const doc = buildArchetype("software-engineer");
    expect(doc).not.toBeNull();

    const ats = buildAtsText(doc!);

    expect(ats).toContain("Languages\nTypeScript, Python, Go, SQL");
    expect(ats).toContain("Backend\nNode.js, PostgreSQL, Redis, GraphQL");
    expect(ats).toContain("Cloud & DevOps\nAWS, Docker, Kubernetes, Terraform");
  });

  it.each(ARCHETYPES.map((archetype) => [archetype.id, archetype] as const))(
    "%s uses quantified XYZ bullets and valid start dates",
    (_id, archetype) => {
      const doc = archetype.build();
      const experienceBlocks = doc.sections.experience.items.map(
        (item) => item.summary,
      );
      const projectBlocks = doc.sections.projects.items.map(
        (item) => item.description,
      );

      for (const html of experienceBlocks) {
        expect(bulletLines(html).length).toBeGreaterThanOrEqual(3);
      }

      for (const html of projectBlocks) {
        expect(bulletLines(html).length).toBeGreaterThanOrEqual(2);
      }

      for (const html of [...experienceBlocks, ...projectBlocks]) {
        for (const line of bulletLines(html)) {
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
    },
  );

  it.each(ARCHETYPES.map((archetype) => [archetype.id, archetype] as const))(
    "%s keeps the starter sample compact enough for one page",
    (_id, archetype) => {
      const doc = archetype.build();
      const summarySentences = doc.summary.content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);

      // The Playwright flow suite proves the real page count. This budget stops
      // future sample edits from quietly adding overflow-prone content.
      expect(summarySentences.length).toBeLessThanOrEqual(2);

      for (const item of doc.sections.projects.items) {
        expect(bulletLines(item.description)).toHaveLength(2);
      }

      const totalBullets = [
        ...doc.sections.experience.items.map((item) => item.summary),
        ...doc.sections.projects.items.map((item) => item.description),
      ].reduce((count, html) => count + bulletLines(html).length, 0);

      expect(totalBullets).toBeLessThanOrEqual(10);
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
