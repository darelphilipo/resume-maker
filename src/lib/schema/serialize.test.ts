import { describe, expect, it } from "vitest";

import { createEmptyResume } from "./defaults";
import { parseResumeJson, serializeResume } from "./serialize";

describe("serializeResume", () => {
  it("round-trips to a deep-equal document", () => {
    const doc = createEmptyResume();

    expect(JSON.parse(serializeResume(doc))).toEqual(doc);
  });
});

describe("parseResumeJson", () => {
  it("rejects malformed JSON without throwing", () => {
    const result = parseResumeJson("{bad");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it("rejects input that fails schema validation", () => {
    const result = parseResumeJson({ basics: 1 });

    expect(result.ok).toBe(false);
  });

  it("accepts a partial document from a JSON string", () => {
    const result = parseResumeJson('{"basics":{"name":"Ada"}}');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.basics.name).toBe("Ada");
    }
  });

  it("gives a partial document one canonical layout page", () => {
    const result = parseResumeJson('{"basics":{"name":"Ada"}}');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.metadata.layout.pages).toHaveLength(1);
      expect(result.doc.metadata.layout.pages[0].main[0]).toBe("summary");
      expect(result.doc.metadata.layout.pages[0].sidebar).toEqual([]);
    }
  });

  it("round-trips an explicit multi-page layout unchanged", () => {
    const pages = [
      {
        fullWidth: false,
        main: ["experience", "education"],
        sidebar: ["skills"],
      },
      { fullWidth: true, main: ["projects"], sidebar: [] },
    ];
    const first = parseResumeJson({ metadata: { layout: { pages } } });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(first.doc.metadata.layout.pages).toEqual(pages);

    const second = parseResumeJson(serializeResume(first.doc));

    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.doc.metadata.layout.pages).toEqual(pages);
    }
  });

  it("imports an open JSON Resume file through the same parser", () => {
    const result = parseResumeJson(
      JSON.stringify({
        $schema:
          "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
        basics: { name: "Grace Hopper", label: "Computer Scientist" },
        work: [
          {
            name: "US Navy",
            position: "Rear Admiral",
            startDate: "1944-01-01",
            endDate: "1986-01-01",
            highlights: ["Built the first compiler"],
          },
        ],
        skills: [{ name: "Languages", keywords: ["COBOL"] }],
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.basics.name).toBe("Grace Hopper");
      expect(result.doc.basics.headline).toBe("Computer Scientist");
      expect(result.doc.sections.experience.items[0]).toMatchObject({
        company: "US Navy",
        position: "Rear Admiral",
        startDate: "1944-01",
        endDate: "1986-01",
      });
      expect(result.doc.sections.skills.items[0].keywords).toEqual(["COBOL"]);
    }
  });

  it("keeps a Resume Maker backup on the native schema path", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    doc.sections.experience.items = [
      {
        id: "e1",
        hidden: false,
        company: "Analytical Engines",
        position: "Mathematician",
        location: "",
        startDate: "1842-06",
        endDate: "1843-09",
        current: false,
        summary: "",
      },
    ];

    const result = parseResumeJson(serializeResume(doc));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.sections.experience.items[0].company).toBe(
        "Analytical Engines",
      );
      expect(result.doc.metadata.template).toBe("onyx");
    }
  });
});
