import { describe, expect, it } from "vitest";

import {
  FALLBACK_CHAR_WIDTH,
  computeTypicalCharWidth,
  flattenPdfLines,
  fontSizeFromItem,
  fontSizeFromTransform,
  isBoldFontName,
  joinPhraseSegments,
  layoutPdfPage,
  layoutPdfPages,
  mergeWrappedPdfLines,
  normalizePdfText,
  shouldAddSpaceBetweenText,
  type PdfTextItem,
} from "./pdfLayout";

function item(
  str: string,
  x: number,
  y: number,
  width = str.length * 5,
  extra: Partial<PdfTextItem> = {},
): PdfTextItem {
  return {
    str,
    transform: [1, 0, 0, 1, x, y],
    width,
    ...extra,
  };
}

function textLines(items: PdfTextItem[]): string[] {
  return layoutPdfPage(items)
    .flat()
    .map((line) => line.text);
}

describe("font metadata", () => {
  it("recognises bold font names with subset prefixes", () => {
    expect(isBoldFontName("ABCDEF+Arial-BoldMT")).toBe(true);
    expect(isBoldFontName("Helvetica-Heavy")).toBe(true);
    expect(isBoldFontName("Inter-DemiBold")).toBe(true);
    expect(isBoldFontName("Roboto-Black")).toBe(true);
    expect(isBoldFontName("ArialMT")).toBe(false);
    expect(isBoldFontName("")).toBe(false);
  });

  it("derives font size from the transform, then the item height", () => {
    expect(fontSizeFromTransform([12, 0, 0, 12, 0, 0])).toBe(12);
    expect(fontSizeFromTransform([0, 14, -14, 0, 0, 0])).toBe(14);
    expect(fontSizeFromTransform(undefined)).toBe(0);
    expect(fontSizeFromItem({ transform: [10, 0, 0, 10, 0, 0], height: 99 })).toBe(
      10,
    );
    expect(fontSizeFromItem({ transform: [0, 0, 0, 0, 0, 0], height: 9 })).toBe(
      9,
    );
  });

  it("marks a heading line and its phrases as bold", () => {
    const lines = layoutPdfPage([
      item("JANE DOE", 10, 700, 60, { fontName: "ABCDEF+Arial-BoldMT" }),
      item("jane@example.com", 10, 685, 70, { fontName: "ArialMT" }),
    ]).flat();

    expect(lines[0]).toMatchObject({
      text: "JANE DOE",
      isBoldLine: true,
      maxFontSize: 1,
    });
    expect(lines[0].phrases[0]).toMatchObject({
      isBold: true,
      fontName: "ABCDEF+Arial-BoldMT",
    });
    expect(lines[1].isBoldLine).toBe(false);
  });
});

describe("typicalCharWidth", () => {
  it("uses the modal body font and ignores a large heading", () => {
    const body = Array.from({ length: 5 }, (_, index) =>
      item("Experience at Acme Corp", 10, 600 - index * 14, 110, {
        transform: [10, 0, 0, 10, 10, 600 - index * 14],
        fontName: "BodyMT",
      }),
    );
    const heading = item("EXPERIENCE", 10, 700, 120, {
      transform: [24, 0, 0, 24, 10, 700],
      fontName: "Heading-Bold",
    });

    expect(computeTypicalCharWidth([heading, ...body])).toBeCloseTo(
      110 / "Experience at Acme Corp".length,
      5,
    );
  });

  it("falls back when there is no measurable text", () => {
    expect(computeTypicalCharWidth([])).toBe(FALLBACK_CHAR_WIDTH);
  });

  it("keeps close runs in one phrase and distant runs separate", () => {
    const close = layoutPdfPage([
      item("Jane", 10, 700, 20),
      item("Doe", 34, 700, 18),
    ]).flat();
    expect(close[0].phrases).toHaveLength(1);
    expect(close[0].text).toBe("Jane Doe");

    const distant = layoutPdfPage([
      item("Acme Corp", 10, 700, 45),
      item("Jan 2020", 300, 700, 40),
    ]).flat();
    expect(distant[0].phrases).toHaveLength(2);
    expect(distant[0].phrases[1]).toMatchObject({ text: "Jan 2020", x: 300 });
    expect(distant[0].text).toBe("Acme Corp Jan 2020");
  });
});

describe("shouldAddSpaceBetweenText", () => {
  it("adds a space after list punctuation and bullets", () => {
    expect(shouldAddSpaceBetweenText("Skills:", "Python")).toBe(true);
    expect(shouldAddSpaceBetweenText("SQL,", "SAP")).toBe(true);
    expect(shouldAddSpaceBetweenText("Platform", "|")).toBe(true);
    expect(shouldAddSpaceBetweenText("•", "Built")).toBe(true);
    expect(shouldAddSpaceBetweenText("Completed", "•")).toBe(true);
  });

  it("keeps punctuation attached to the preceding word", () => {
    expect(shouldAddSpaceBetweenText("Skills", ": Python")).toBe(false);
    expect(shouldAddSpaceBetweenText("Completed", ".")).toBe(false);
    expect(shouldAddSpaceBetweenText("(555)", "123-4567")).toBe(true);
  });

  it("never doubles an existing whitespace boundary", () => {
    expect(shouldAddSpaceBetweenText("Jane ", "Doe")).toBe(false);
    expect(shouldAddSpaceBetweenText("Jane", " Doe")).toBe(false);
    expect(shouldAddSpaceBetweenText("", "Doe")).toBe(false);
  });

  it("keeps merged tokens readable on a line", () => {
    const lines = textLines([
      item("Skills:", 10, 700, 32),
      item("Python", 42, 700, 30),
      item("SQL,", 10, 685, 25),
      item("SAP", 35, 685, 20),
    ]);

    expect(lines).toEqual(["Skills: Python", "SQL, SAP"]);
  });
});

describe("glyph cleanup", () => {
  it("strips icon-font and zero-width glyphs", () => {
    const lines = textLines([
      item("\uE901 Ada\u200B Lovelace \uE902", 10, 700, 90),
      item("\uE903", 10, 685, 8),
      item("ada@example.com", 10, 670, 70),
    ]);

    expect(lines).toEqual(["Ada Lovelace", "ada@example.com"]);
  });

  it("rejoins soft-hyphen line wraps", () => {
    const lines = layoutPdfPage([
      item("https://exa\u00AD", 10, 700, 70),
      item("mple.com/path", 10, 685, 80),
    ]).flat();

    expect(lines[0].joinNext).toBe(true);

    const merged = mergeWrappedPdfLines(lines);

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe("https://example.com/path");
  });

  it("rejoins a non-breaking hyphen line wrap without a space", () => {
    const lines = layoutPdfPage([
      item("Soft\u2011", 10, 700, 30),
      item("ware", 10, 685, 30),
    ]).flat();

    expect(lines[0].joinNext).toBe(true);

    const merged = mergeWrappedPdfLines(lines);

    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe("Software");
  });
});

describe("typographic normalization", () => {
  it("decomposes ligatures and straightens smart quotes and dashes", () => {
    expect(normalizePdfText("O\ufb03ce \ufb01le")).toBe("Office file");
    expect(normalizePdfText("\u201cBuilt\u201d \u2018APIs\u2019")).toBe(
      '"Built" \'APIs\'',
    );
    expect(normalizePdfText("2019\u201321 \u2014 2023")).toBe("2019-21 - 2023");
  });

  it("turns decorative line-start bullets into a plain bullet", () => {
    expect(normalizePdfText("\u27A2 Built billing")).toBe("• Built billing");
    expect(normalizePdfText("\u2713 Shipped the release")).toBe(
      "• Shipped the release",
    );
    expect(normalizePdfText("\u25C6 Cut latency")).toBe("• Cut latency");
    // A decorative glyph inside a word is left alone; only a line-start bullet
    // marker is rewritten.
    expect(normalizePdfText("Design \u2713 review")).toBe("Design \u2713 review");
  });

  it("reads ligatures and smart quotes out of a real PDF line", () => {
    const lines = textLines([
      item("O\ufb03ce \u201cShip\u201d \ufb01le", 10, 700, 90),
    ]);

    expect(lines).toEqual(['Office "Ship" file']);
  });
});

describe("joinPhraseSegments", () => {
  it("uses commas for wide skill-column gaps", () => {
    expect(joinPhraseSegments(["Python", "SQL", "Spark"])).toBe(
      "Python, SQL, Spark",
    );
  });

  it("keeps an existing separator instead of doubling it", () => {
    expect(joinPhraseSegments(["Python,", "SQL"])).toBe("Python, SQL");
    expect(joinPhraseSegments(["Skills:", "Python"])).toBe("Skills: Python");
    expect(joinPhraseSegments(["• Python", "SQL"])).toBe("• Python, SQL");
  });

  it("turns a wide visual gap on a skills line into comma-separated keywords", () => {
    const lines = layoutPdfPage([
      item("Python", 10, 700, 30),
      item("SQL", 120, 700, 15),
      item("Spark", 200, 700, 25),
    ]).flat();

    expect(lines[0].phrases.length).toBeGreaterThan(1);
    expect(joinPhraseSegments(lines[0].phrases.map((phrase) => phrase.text))).toBe(
      "Python, SQL, Spark",
    );
  });
});

describe("line metadata", () => {
  it("records the vertical gap between consecutive lines", () => {
    const lines = layoutPdfPage([
      item("Name", 10, 700, 30),
      item("Role", 10, 686, 30),
      item("Acme", 10, 660, 30),
    ]).flat();

    expect(lines[0].lineGap).toBeUndefined();
    expect(lines[1].lineGap).toBe(14);
    expect(lines[2].lineGap).toBe(26);
  });

  it("marks page and column boundaries in the flattened reading order", () => {
    const columnPage = [
      item("Jane Doe", 20, 790, 540),
      item("Senior Product Manager", 20, 770, 400),
      item("SKILLS", 20, 730, 45),
      item("Python", 20, 715, 35),
      item("SQL", 20, 700, 18),
      item("CONTACT", 20, 680, 50),
      item("jane@example.com", 20, 665, 80),
      item("EXPERIENCE", 320, 730, 70),
      item("Acme Corp", 320, 715, 55),
      item("Senior Engineer | Jan 2020 - Present", 320, 700, 190),
      item("• Built the billing service.", 320, 682, 140),
      item("EDUCATION", 320, 650, 70),
      item("State University", 320, 635, 90),
    ];
    const flat = flattenPdfLines(layoutPdfPages([columnPage]));

    expect(flat.find((line) => line.text === "SKILLS")?.breakBefore).toBe(
      "column",
    );
    expect(flat.find((line) => line.text === "EXPERIENCE")?.breakBefore).toBe(
      "column",
    );
    expect(flat[0].breakBefore).toBeUndefined();

    const pages = flattenPdfLines(
      layoutPdfPages([
        [item("Page one", 10, 700, 40)],
        [item("Page two", 10, 700, 40)],
      ]),
    );

    expect(pages[1].breakBefore).toBe("page");
  });
});

describe("two-column Canva layout", () => {
  it("emits the banner, the left sidebar, then the right main column", () => {
    const groups = layoutPdfPage([
      item("Jane Doe", 20, 790, 540, {
        transform: [18, 0, 0, 18, 20, 790],
        fontName: "Name-Bold",
      }),
      item("Senior Product Manager", 20, 770, 400),
      item("SKILLS", 20, 730, 45, {
        transform: [10, 0, 0, 10, 20, 730],
        fontName: "Head-Bold",
      }),
      item("Python", 20, 715, 35),
      item("SQL", 20, 700, 18),
      item("CONTACT", 20, 680, 50, {
        transform: [10, 0, 0, 10, 20, 680],
        fontName: "Head-Bold",
      }),
      item("jane@example.com", 20, 665, 80),
      item("EXPERIENCE", 320, 730, 70, {
        transform: [10, 0, 0, 10, 320, 730],
        fontName: "Head-Bold",
      }),
      item("Acme Corp", 320, 715, 55),
      item("Senior Engineer | Jan 2020 - Present", 320, 700, 190),
      item("• Built the billing service.", 320, 682, 140),
      item("EDUCATION", 320, 650, 70, {
        transform: [10, 0, 0, 10, 320, 650],
        fontName: "Head-Bold",
      }),
      item("State University", 320, 635, 90),
    ]);

    expect(groups).toHaveLength(3);
    expect(groups[0].map((line) => line.text)).toEqual([
      "Jane Doe",
      "Senior Product Manager",
    ]);
    expect(groups[1].map((line) => line.text)).toEqual([
      "SKILLS",
      "Python",
      "SQL",
      "CONTACT",
      "jane@example.com",
    ]);
    expect(groups[2].map((line) => line.text)).toEqual([
      "EXPERIENCE",
      "Acme Corp",
      "Senior Engineer | Jan 2020 - Present",
      "• Built the billing service.",
      "EDUCATION",
      "State University",
    ]);
    expect(groups[1][0].isBoldLine).toBe(true);
    expect(groups[1][0].maxFontSize).toBe(10);
    expect(groups[0][0].maxFontSize).toBe(18);
  });
});
