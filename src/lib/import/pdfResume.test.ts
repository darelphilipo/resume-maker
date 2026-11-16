import { describe, expect, it } from "vitest";

import { parsePastedResume } from "@/lib/import/pasteResume";

import { groupPdfTextItems, type PdfTextItem } from "./pdfResume";

function item(
  str: string,
  x: number,
  y: number,
  width = str.length * 5,
): PdfTextItem {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
    width,
  };
}

describe("groupPdfTextItems", () => {
  it("orders items on the same baseline by x and keeps word gaps", () => {
    const text = groupPdfTextItems([
      [item("Doe", 32, 700, 18), item("Jane", 10, 700, 20)],
    ]);

    expect(text).toBe("Jane Doe");
  });

  it("joins fragments with no visual gap into one word", () => {
    const text = groupPdfTextItems([
      [item("https://", 10, 700, 20), item("example.com", 30, 700, 45)],
    ]);

    expect(text).toBe("https://example.com");
  });

  it("keeps a space between visually separate fragments", () => {
    const text = groupPdfTextItems([
      [item("(555)", 10, 700, 30), item("123-4567", 44, 700, 45)],
    ]);

    expect(text).toBe("(555) 123-4567");
  });

  it("splits lines by y and starts a new paragraph after a large gap", () => {
    const text = groupPdfTextItems([
      [
        item("Jane Doe", 10, 700, 45),
        item("Senior Engineer", 10, 685, 60),
        item("Acme Corp", 10, 670, 45),
        item("Built the billing service.", 10, 600, 120),
      ],
    ]);

    expect(text).toBe(
      "Jane Doe\nSenior Engineer\nAcme Corp\n\nBuilt the billing service.",
    );
  });

  it("ignores empty text items and separates pages", () => {
    const text = groupPdfTextItems([
      [item("Page one", 10, 700, 40), item("  ", 10, 690)],
      [item("Page two", 10, 700, 40)],
    ]);

    expect(text).toBe("Page one\n\nPage two");
  });

  it("feeds reconstructed text through the paste parser", () => {
    const text = groupPdfTextItems([
      [
        item("Ada Lovelace", 10, 760, 60),
        item("ada@example.com", 10, 745, 70),
        item("EXPERIENCE", 10, 700, 55),
        item("Senior Engineer", 10, 685, 70),
        item("Analytical Engines | Jan 2020 - Present", 10, 670, 160),
        item("• Built the first algorithm.", 10, 650, 120),
        item("SKILLS", 10, 600, 30),
        item("Mathematics: Algebra, Logic", 10, 585, 100),
      ],
    ]);

    const doc = parsePastedResume(text);

    expect(doc?.basics.name).toBe("Ada Lovelace");
    expect(doc?.basics.email).toBe("ada@example.com");
    expect(doc?.sections.experience.items[0]).toMatchObject({
      position: "Senior Engineer",
      company: "Analytical Engines",
      startDate: "2020-01",
      current: true,
    });
    expect(doc?.sections.experience.items[0]?.summary).toContain(
      "Built the first algorithm.",
    );
    expect(doc?.sections.skills.items[0]).toMatchObject({
      name: "Mathematics",
      keywords: ["Algebra", "Logic"],
    });
  });
});
