import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LONG_BULLET_CHARS,
  analyzeBulletLines,
  bulletSnippet,
  measureBulletLines,
  scanBulletLint,
  summarizeBulletIssues,
} from "./bulletMetrics";

function makeRect(top: number): DOMRect {
  return {
    top,
    bottom: top + 14,
    left: 0,
    right: 40,
    width: 40,
    height: 14,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

const originalGetClientRects = Range.prototype.getClientRects;

function stubLinesAfter(words: readonly string[]): void {
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value(this: Range): DOMRectList {
      const top = words.includes(this.toString()) ? 20 : 0;

      return [makeRect(top)] as unknown as DOMRectList;
    },
  });
}

afterEach(() => {
  if (originalGetClientRects) {
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: originalGetClientRects,
    });
  } else {
    delete (Range.prototype as { getClientRects?: unknown }).getClientRects;
  }

  document.body.innerHTML = "";
});

describe("analyzeBulletLines", () => {
  it("flags a wrapped bullet whose last line holds three words", () => {
    const issue = analyzeBulletLines([
      "Led the billing migration for the platform and",
      "saved 3 hours",
    ]);

    expect(issue).toMatchObject({
      kind: "orphan",
      lineCount: 2,
      lastLineWords: 3,
      reclaimableLines: 1,
    });
    expect(issue?.text).toBe(
      "Led the billing migration for the platform and saved 3 hours",
    );
  });

  it("does not flag a healthy two-line bullet", () => {
    expect(
      analyzeBulletLines([
        "Led the billing migration for the platform and",
        "saved three hours every week",
      ]),
    ).toBeNull();
  });

  it("does not flag a single-line bullet", () => {
    expect(analyzeBulletLines(["Shipped the onboarding flow"])).toBeNull();
  });

  it("flags a bullet that runs past the character budget", () => {
    const issue = analyzeBulletLines([
      "Built ".repeat(LONG_BULLET_CHARS / 6 + 2),
    ]);

    expect(issue).toMatchObject({ kind: "long", lineCount: 1 });
    expect(issue!.charCount).toBeGreaterThanOrEqual(LONG_BULLET_CHARS);
  });

  it("flags a bullet that runs past three rendered lines", () => {
    const issue = analyzeBulletLines([
      "Owned the platform roadmap",
      "across three product teams",
      "and every regional launch",
      "in the last fiscal year",
    ]);

    expect(issue).toMatchObject({
      kind: "long",
      lineCount: 4,
      reclaimableLines: 1,
    });
  });

  it("prefers the long classification when both checks match", () => {
    const issue = analyzeBulletLines([
      "Owned the platform roadmap across every product team and region",
      "while also writing the migration guide for each launch",
      "and coaching every new engineer through their first release",
      "on time",
    ]);

    expect(issue?.kind).toBe("long");
    expect(issue?.lastLineWords).toBe(2);
  });
});

describe("summarizeBulletIssues", () => {
  it("returns a clean report when there is nothing to trim", () => {
    expect(summarizeBulletIssues([])).toEqual({
      issues: [],
      orphanCount: 0,
      longCount: 0,
      reclaimableLines: 0,
      summary: null,
    });
  });

  it("summarizes mixed orphan and long bullets", () => {
    const orphan = analyzeBulletLines([
      "Led the billing migration for the platform and",
      "saved 3 hours",
    ])!;
    const orphanOneWord = analyzeBulletLines([
      "Shipped the onboarding flow for every new customer",
      "weekly",
    ])!;
    const long = analyzeBulletLines(["Built ".repeat(60)])!;

    const report = summarizeBulletIssues([orphan, orphanOneWord, long]);

    expect(report.orphanCount).toBe(2);
    expect(report.longCount).toBe(1);
    expect(report.reclaimableLines).toBe(3);
    expect(report.summary).toBe(
      "2 bullets spill by 1–3 words and 1 long bullet (240+ characters) — trimming them can reclaim 3 lines.",
    );
  });

  it("uses singular copy for one orphan", () => {
    const report = summarizeBulletIssues([
      analyzeBulletLines([
        "Led the billing migration for the platform and",
        "saved 3 hours",
      ])!,
    ]);

    expect(report.summary).toBe(
      "1 bullet spills by 1–3 words — trimming it can reclaim 1 line.",
    );
  });

  it("does not render a one-word orphan as a 1–1 range", () => {
    const report = summarizeBulletIssues([
      analyzeBulletLines([
        "Shipped the onboarding flow for every new customer",
        "weekly",
      ])!,
    ]);

    expect(report.summary).toBe(
      "1 bullet spills by 1 word — trimming it can reclaim 1 line.",
    );
  });
});

describe("bulletSnippet", () => {
  it("collapses whitespace and leaves short text intact", () => {
    expect(bulletSnippet("  Shipped   the flow  ")).toBe("Shipped the flow");
  });

  it("cuts long text at a word boundary", () => {
    const snippet = bulletSnippet("Alpha beta gamma delta epsilon zeta", 20);

    expect(snippet.length).toBeLessThanOrEqual(21);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet).toBe("Alpha beta gamma…");
  });
});

describe("measureBulletLines", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("groups inline-formatted words into rendered lines", () => {
    stubLinesAfter(["delta", "epsilon"]);

    const item = document.createElement("li");

    item.innerHTML = "<strong>Alpha</strong> beta gamma delta epsilon";
    document.body.append(item);

    expect(measureBulletLines(item)).toEqual([
      "Alpha beta gamma",
      "delta epsilon",
    ]);
  });

  it("falls back to one line when the DOM has no layout", () => {
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => [] as unknown as DOMRectList,
    });

    const item = document.createElement("li");

    item.textContent = "  Shipped   the onboarding flow  ";
    document.body.append(item);

    expect(measureBulletLines(item)).toEqual([
      "Shipped the onboarding flow",
    ]);
  });
});

describe("scanBulletLint", () => {
  it("scans rendered bullets and reports only the wasteful ones", () => {
    const root = document.createElement("div");

    root.innerHTML = `
      <ul>
        <li>Shipped the onboarding flow</li>
        <li>${"Built ".repeat(60)}</li>
      </ul>
    `;

    const report = scanBulletLint(root);

    expect(report.issues).toHaveLength(1);
    expect(report.longCount).toBe(1);
    expect(report.orphanCount).toBe(0);
  });

  it("skips a parent list item so nested bullets are counted once", () => {
    const root = document.createElement("div");

    root.innerHTML = `
      <ul>
        <li>${"Built ".repeat(60)}
          <ul><li>Shipped the flow</li></ul>
        </li>
      </ul>
    `;

    expect(scanBulletLint(root).issues).toHaveLength(0);
  });

  it("ignores its own trim-tips list", () => {
    const root = document.createElement("div");

    root.innerHTML = `
      <div data-bullet-trim-tips>
        <ul><li>${"Built ".repeat(60)}</li></ul>
      </div>
    `;

    expect(scanBulletLint(root).issues).toHaveLength(0);
  });
});
