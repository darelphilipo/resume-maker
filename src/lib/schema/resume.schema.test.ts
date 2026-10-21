import { describe, expect, it } from "vitest";

import { ResumeDocumentSchema, SECTION_IDS, TEMPLATE_IDS } from "./resume.schema";

describe("ResumeDocumentSchema", () => {
  it("fills every default when only basics.name is supplied", () => {
    const doc = ResumeDocumentSchema.parse({ basics: { name: "Ada" } });

    expect(doc.basics.name).toBe("Ada");
    expect(doc.basics.email).toBe("");
    expect(doc.basics.website).toEqual({ url: "", label: "" });
    expect(doc.metadata.page.marginX).toBe(14);
    expect(doc.sections.experience.items).toEqual([]);
    expect(doc.customSections).toEqual([]);
  });

  it("strips unknown keys", () => {
    const doc = ResumeDocumentSchema.parse({
      junk: true,
      basics: { name: "Ada" },
    });

    expect("junk" in doc).toBe(false);
  });

  it("exposes the canonical template and section ids", () => {
    expect(TEMPLATE_IDS).toEqual([
      "onyx",
      "persian",
      "bronzor",
      "chikorita",
      "azurill",
      "gengar",
    ]);
    expect(SECTION_IDS).toEqual([
      "profiles",
      "experience",
      "education",
      "projects",
      "skills",
      "certifications",
      "awards",
      "languages",
      "interests",
      "volunteer",
      "publications",
      "references",
    ]);
  });
});
