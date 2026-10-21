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
});
