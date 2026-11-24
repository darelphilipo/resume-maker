import { describe, expect, it } from "vitest";

import {
  AI_IMPORT_EMPTY_MESSAGE,
  AI_IMPORT_INCOMPLETE_MESSAGE,
  AI_IMPORT_INVALID_MESSAGE,
  AI_IMPORT_PROMPT,
  extractJsonBlock,
  parseAiJsonResume,
  stripCodeFences,
  stripTrailingCommas,
} from "./aiJsonImport";
import { createEmptyResume } from "@/lib/schema/defaults";
import { serializeResume } from "@/lib/schema/serialize";

const JSON_RESUME = JSON.stringify({
  $schema: "https://jsonresume.org/schema/",
  basics: { name: "Ada Lovelace", label: "Mathematician", email: "ada@example.com" },
  work: [
    {
      name: "Analytical Engine",
      position: "Programmer",
      startDate: "1843-01",
      highlights: ["Wrote the first algorithm"],
    },
  ],
  skills: [{ name: "Math", keywords: ["Algebra"] }],
});

describe("aiJsonImport helpers", () => {
  it("ships a copyable prompt that asks for plain JSON Resume output", () => {
    expect(AI_IMPORT_PROMPT).toContain("JSON Resume format");
    expect(AI_IMPORT_PROMPT).toContain("no markdown fences");
    expect(AI_IMPORT_PROMPT).toContain("Resume:");
  });

  it("removes markdown fence lines but keeps the JSON body", () => {
    const pasted = "```json\n" + JSON_RESUME + "\n```";

    expect(stripCodeFences(pasted).trim()).toBe(JSON_RESUME);
    expect(stripCodeFences(JSON_RESUME)).toBe(JSON_RESUME);
  });

  it("extracts the first balanced block and ignores braces inside strings", () => {
    expect(
      extractJsonBlock('Sure! {"basics":{"name":"A} B"}} Hope that helps.'),
    ).toBe('{"basics":{"name":"A} B"}}');
    expect(extractJsonBlock("No JSON here, just prose")).toBeNull();
    expect(extractJsonBlock('{"basics":')).toBeNull();
  });

  it("drops only trailing commas, including those after whitespace", () => {
    expect(stripTrailingCommas('{"a": [1, 2, ], "b": "x,y",}')).toBe(
      '{"a": [1, 2], "b": "x,y"}',
    );
  });
});

describe("parseAiJsonResume", () => {
  it("parses a fenced JSON Resume reply", () => {
    const result = parseAiJsonResume("```json\n" + JSON_RESUME + "\n```");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.doc.basics.name).toBe("Ada Lovelace");
    expect(result.doc.basics.headline).toBe("Mathematician");
    expect(result.doc.sections.experience.items[0]).toMatchObject({
      company: "Analytical Engine",
      position: "Programmer",
      startDate: "1843-01",
    });
    expect(result.doc.sections.experience.items[0].summary).toContain(
      "Wrote the first algorithm",
    );
    expect(result.doc.sections.skills.items[0].keywords).toEqual(["Algebra"]);
  });

  it("parses prose-wrapped JSON with trailing commas", () => {
    const pasted = [
      "Here is the resume converted to the standard format:",
      "```json",
      '{"basics":{"name":"Grace Hopper","label":"Rear Admiral",},',
      '"work":[{"name":"US Navy","position":"Rear Admiral",}],}',
      "```",
      "Let me know if you need any changes!",
    ].join("\n");

    const result = parseAiJsonResume(pasted);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.doc.basics.name).toBe("Grace Hopper");
    expect(result.doc.sections.experience.items[0].company).toBe("US Navy");
  });

  it("accepts a native Resume Maker backup pasted back verbatim", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Katherine Johnson";

    const result = parseAiJsonResume(serializeResume(doc));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.doc.basics.name).toBe("Katherine Johnson");
  });

  it("reports a friendly error for an empty paste", () => {
    expect(parseAiJsonResume("   ")).toEqual({
      ok: false,
      error: AI_IMPORT_EMPTY_MESSAGE,
    });
  });

  it("reports an incomplete paste instead of a raw JSON error", () => {
    const truncated = "```json\n" + JSON_RESUME.slice(0, -40);

    expect(parseAiJsonResume(truncated)).toEqual({
      ok: false,
      error: AI_IMPORT_INCOMPLETE_MESSAGE,
    });
    expect(parseAiJsonResume("Here you go: {not json}")).toEqual({
      ok: false,
      error: AI_IMPORT_INCOMPLETE_MESSAGE,
    });
  });

  it("reports valid JSON that is not a resume", () => {
    expect(parseAiJsonResume('{"hello":"world"}')).toEqual({
      ok: false,
      error: AI_IMPORT_INVALID_MESSAGE,
    });
  });
});
