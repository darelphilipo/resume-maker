import { describe, expect, it } from "vitest";

import {
  EDUCATION_HEADER_FEATURES,
  EXPERIENCE_HEADER_FEATURES,
  NAME_FEATURES,
  PROJECT_HEADER_FEATURES,
  getDescriptionsLineIdx,
  scoreBestCandidate,
  scoreCandidateFields,
  scoreFeatures,
  type ScorableText,
} from "./featureScoring";

const plain = (text: string): ScorableText => ({ text, isBold: false });
const bold = (text: string, maxFontSize = 0): ScorableText => ({
  text,
  isBold: true,
  maxFontSize,
});

describe("scoreFeatures", () => {
  it("sums the weights of matching predicates and ignores misses", () => {
    const score = scoreFeatures(bold("Ada Lovelace", 24), NAME_FEATURES, {
      maxFontSize: 24,
    });

    // letters + largest font + bold, with no penalty.
    expect(score).toBe(8);
  });

  it("applies negative weights to contact-like values", () => {
    const score = scoreFeatures(
      plain("ada@example.com"),
      NAME_FEATURES,
      { maxFontSize: 24 },
    );

    expect(score).toBeLessThan(0);
  });
});

describe("scoreCandidateFields", () => {
  it("returns one field per value so a bold title is not also a company", () => {
    const result = scoreCandidateFields(
      bold("Senior Software Engineer"),
      EXPERIENCE_HEADER_FEATURES,
    );

    expect(result).toEqual({ field: "jobTitle", score: 3 });
  });

  it("classifies a company line", () => {
    const result = scoreCandidateFields(
      bold("Acme Labs"),
      EXPERIENCE_HEADER_FEATURES,
    );

    expect(result).toEqual({ field: "company", score: 5 });
  });

  it("returns null when nothing scores positively", () => {
    expect(
      scoreCandidateFields(plain("Seattle, WA"), [
        { field: "name", predicates: NAME_FEATURES },
      ]),
    ).toBeNull();
  });
});

describe("scoreBestCandidate", () => {
  it("prefers the largest, boldest name in the header", () => {
    const result = scoreBestCandidate(
      [
        plain("Senior Software Engineer"),
        bold("Jane Doe", 22),
        plain("jane@example.com"),
      ],
      [{ field: "name", predicates: NAME_FEATURES }],
    );

    expect(result?.field).toBe("name");
    expect(result?.value.text).toBe("Jane Doe");
    expect(result?.index).toBe(1);
  });

  it("keeps the earliest value when the metadata ties", () => {
    const result = scoreBestCandidate(
      [plain("Jane Doe"), plain("John Doe")],
      [{ field: "name", predicates: NAME_FEATURES }],
    );

    expect(result?.value.text).toBe("Jane Doe");
    expect(result?.index).toBe(0);
  });

  it("never returns a candidate below the minimum score", () => {
    const result = scoreBestCandidate(
      [plain("Seattle, WA")],
      [{ field: "name", predicates: NAME_FEATURES }],
      { minScore: 1 },
    );

    expect(result).toBeNull();
  });

  it("scores experience headers as company, job title, or date", () => {
    const headers = [
      bold("Senior Product Manager"),
      plain("Acme Corp"),
      plain("Jan 2020 - Present"),
    ];
    const fields = headers.map(
      (header) => scoreCandidateFields(header, EXPERIENCE_HEADER_FEATURES)?.field,
    );

    expect(fields).toEqual(["jobTitle", "company", "date"]);
  });

  it("scores education headers as school, degree, grade, or date", () => {
    const headers = [
      bold("University of Washington"),
      plain("B.S. in Computer Science"),
      plain("GPA: 3.8"),
      plain("Sep 2012 - Jun 2016"),
    ];
    const fields = headers.map(
      (header) => scoreCandidateFields(header, EDUCATION_HEADER_FEATURES)?.field,
    );

    expect(fields).toEqual(["school", "degree", "grade", "date"]);
  });

  it("scores a bare 0-4 grade and a Completed in YYYY date", () => {
    expect(
      scoreCandidateFields(plain("3.8"), EDUCATION_HEADER_FEATURES)?.field,
    ).toBe("grade");
    expect(
      scoreCandidateFields(
        plain("Completed in 2018"),
        EXPERIENCE_HEADER_FEATURES,
      )?.field,
    ).toBe("date");
  });

  it("treats Company as Title as a job title, not a company", () => {
    const result = scoreCandidateFields(
      plain("Acme Corp as Senior Engineer"),
      EXPERIENCE_HEADER_FEATURES,
    );

    expect(result?.field).toBe("jobTitle");
  });

  it("scores project headers as name, date, or URL", () => {
    const headers = [
      bold("Revenue Dashboard"),
      plain("Jan 2023 - Present"),
      plain("https://dashboard.example.com"),
    ];
    const fields = headers.map(
      (header) => scoreCandidateFields(header, PROJECT_HEADER_FEATURES)?.field,
    );

    expect(fields).toEqual(["name", "date", "url"]);
  });
});

describe("getDescriptionsLineIdx", () => {
  it("returns the first bullet line", () => {
    const index = getDescriptionsLineIdx([
      { text: "Senior Engineer", isBold: true },
      { text: "Acme Corp", isBold: false },
      { text: "• Cut latency by 40%.", isBold: false },
    ]);

    expect(index).toBe(2);
  });

  it("recognises every expanded Unicode bullet glyph", () => {
    for (const glyph of ["•", "●", "▪", "◦", "‣", "○", "■", "➢", "-", "*"]) {
      const index = getDescriptionsLineIdx([
        { text: "Senior Engineer", isBold: true },
        { text: `${glyph} Shipped the migration.`, isBold: false },
      ]);

      expect(index, glyph).toBe(1);
    }
  });

  it("treats a long non-bold paragraph as the description start when allowed", () => {
    const lines = [
      { text: "Senior Engineer", isBold: true },
      { text: "Acme Corp", isBold: false },
      {
        text: "Led the platform team and shipped the billing rewrite for three regions.",
        isBold: false,
      },
    ];

    expect(
      getDescriptionsLineIdx(lines, { allowUnbulletedProse: true }),
    ).toBe(2);
    expect(getDescriptionsLineIdx(lines)).toBe(-1);
  });

  it("ignores bold long lines and returns -1 when nothing matches", () => {
    const index = getDescriptionsLineIdx(
      [
        { text: "Senior Engineer", isBold: true },
        {
          text: "Led the platform team and shipped the billing rewrite for three regions.",
          isBold: true,
        },
      ],
      { allowUnbulletedProse: true },
    );

    expect(index).toBe(-1);
  });
});
