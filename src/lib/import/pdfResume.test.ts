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

  it("strips private-use icon glyphs and zero-width characters", () => {
    const text = groupPdfTextItems([
      [
        item("\uE900 Jane\u200B Doe \uE901", 10, 700, 90),
        item("ada@example.com", 10, 685, 70),
        item("\uE902", 10, 670, 8),
      ],
    ]);

    expect(text).toBe("Jane Doe\nada@example.com");
  });

  it("rejoins soft-hyphen and broken-glyph line wraps without a space", () => {
    const text = groupPdfTextItems([
      [
        item("https://exa\u00AD", 10, 700, 70),
        item("mple.com/path", 10, 685, 80),
        item("linked\uFFFD", 10, 670, 40),
        item("in.com", 10, 655, 30),
        item("soft\u00ADware", 10, 640, 40),
      ],
    ]);

    expect(text).toBe("https://example.com/path\nlinkedin.com\nsoftware");
  });

  it("emits a two-column page as banner, left column, then right column", () => {
    const text = groupPdfTextItems([
      [
        item("Jane Doe", 10, 800, 560),
        item("Senior Product Manager", 10, 785, 400),
        item("SKILLS", 10, 750, 45),
        item("EXPERIENCE", 300, 750, 70),
        item("Python", 10, 735, 35),
        item("Acme Corp", 300, 735, 55),
        item("SQL", 10, 720, 20),
        item("Senior Engineer | Jan 2020 - Present", 300, 720, 220),
        item("CONTACT", 10, 690, 50),
        item("Built the billing service.", 300, 705, 150),
        item("jane@example.com", 10, 675, 100),
        item("EDUCATION", 300, 670, 70),
        item("State University", 300, 655, 90),
      ],
    ]);

    expect(text).toBe(
      [
        "Jane Doe",
        "Senior Product Manager",
        "",
        "SKILLS",
        "Python",
        "SQL",
        "",
        "CONTACT",
        "jane@example.com",
        "",
        "EXPERIENCE",
        "Acme Corp",
        "Senior Engineer | Jan 2020 - Present",
        "Built the billing service.",
        "",
        "EDUCATION",
        "State University",
      ].join("\n"),
    );
  });

  it("keeps unaligned side columns from interleaving", () => {
    const text = groupPdfTextItems([
      [
        item("SKILLS", 10, 700, 50),
        item("Python", 10, 685, 35),
        item("SQL", 10, 670, 20),
        item("EXPERIENCE", 200, 692, 70),
        item("Acme Corp", 200, 677, 55),
        item("Built the billing service.", 200, 662, 130),
      ],
    ]);

    expect(text).toBe(
      "SKILLS\nPython\nSQL\n\nEXPERIENCE\nAcme Corp\nBuilt the billing service.",
    );
  });

  it("does not mistake right-aligned dates for a second column", () => {
    const text = groupPdfTextItems([
      [
        item("Built the billing service.", 10, 700, 250),
        item("Jan 2020", 500, 700, 40),
        item("Shipped the redesign.", 10, 685, 250),
        item("Sep 2019", 495, 685, 45),
        item("Led the platform team.", 10, 670, 250),
        item("December 2022", 470, 670, 70),
        item("Cut latency in half.", 10, 655, 250),
        item("Jun 2021", 497, 655, 43),
        item("Mentored four engineers.", 10, 640, 250),
        item("Feb 2020", 496, 640, 44),
        item("Ran the migration.", 10, 625, 250),
        item("Nov 2017", 497, 625, 43),
        item("Owned the roadmap.", 10, 610, 250),
        item("Aug 2023", 498, 610, 42),
        item("Hired six engineers.", 10, 595, 250),
        item("May 2018", 490, 595, 50),
      ],
    ]);

    expect(text).toBe(
      [
        "Built the billing service. Jan 2020",
        "Shipped the redesign. Sep 2019",
        "Led the platform team. December 2022",
        "Cut latency in half. Jun 2021",
        "Mentored four engineers. Feb 2020",
        "Ran the migration. Nov 2017",
        "Owned the roadmap. Aug 2023",
        "Hired six engineers. May 2018",
      ].join("\n"),
    );
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
