import { describe, expect, it } from "vitest";

import { createEmptyResume } from "./defaults";
import {
  DEFAULT_SECTION_ORDER,
  ResumeDocumentSchema,
} from "./resume.schema";

const MAIN_ORDER = [
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
];

describe("createEmptyResume", () => {
  it("passes ResumeDocumentSchema validation", () => {
    expect(() => ResumeDocumentSchema.parse(createEmptyResume())).not.toThrow();
  });

  it("pins the canonical defaults", () => {
    const doc = createEmptyResume();

    expect(doc.picture).toEqual({
      hidden: true,
      url: "",
      size: 64,
      aspectRatio: 1,
      borderRadius: 0,
      fit: "cover",
    });
    expect(doc.metadata.page).toEqual({
      format: "a4",
      marginX: 14,
      marginY: 12,
      gapX: 8,
      gapY: 12,
      hideIcons: false,
    });
    expect(doc.metadata.typography.body.fontSize).toBe(11);
    expect(doc.metadata.typography.body.lineHeight).toBe(1.4);
    expect(doc.metadata.layout.sidebarWidth).toBe(35);
    expect(doc.metadata.layout.sidebarSide).toBe("left");
    expect(doc.metadata.schemaVersion).toBe(1);
    expect(doc.metadata.template).toBe("onyx");
  });

  it("seeds exactly one layout page in canonical order", () => {
    const doc = createEmptyResume();

    expect(doc.metadata.layout.pages).toEqual([
      { fullWidth: false, main: MAIN_ORDER, sidebar: [] },
    ]);
    expect(doc.metadata.layout.pages[0].main).toHaveLength(13);
  });

  it("honors the requested template", () => {
    expect(createEmptyResume("persian").metadata.template).toBe("persian");
  });
});

describe("ResumeDocumentSchema layout normalization", () => {
  it("normalizes a missing layout to one canonical page", () => {
    const doc = ResumeDocumentSchema.parse({});

    expect(doc.metadata.layout.pages).toEqual([
      { fullWidth: false, main: MAIN_ORDER, sidebar: [] },
    ]);
  });

  it("exports the canonical section order", () => {
    expect(DEFAULT_SECTION_ORDER).toEqual(MAIN_ORDER);
    expect(DEFAULT_SECTION_ORDER).toHaveLength(13);
    expect(DEFAULT_SECTION_ORDER[0]).toBe("summary");
    expect(DEFAULT_SECTION_ORDER[12]).toBe("references");
  });
});
