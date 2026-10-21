import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

import {
  RICH_TEXT_TAGS,
  sanitizeResumeDocument,
  sanitizeRichText,
} from "./sanitize";

describe("sanitizeRichText", () => {
  it("keeps the allowlisted tags and link attributes", () => {
    const html = sanitizeRichText(
      '<p>Hello <strong>bold</strong> <em>italic</em><br><ul><li>one</li></ul><ol><li>two</li></ol><a href="https://example.com">link</a></p>',
    );

    expect(RICH_TEXT_TAGS).toEqual([
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "a",
    ]);
    expect(html).toContain("<p>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<br>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<ol>");
    expect(html).toContain('href="https://example.com"');
  });

  it("maps b and i to strong and em", () => {
    expect(sanitizeRichText("<p><b>Bold</b> <i>Italic</i></p>")).toBe(
      "<p><strong>Bold</strong> <em>Italic</em></p>",
    );
  });

  it("strips scripts, images, event handlers, styles, and classes", () => {
    const html = sanitizeRichText(
      '<p style="color:red" class="danger" onclick="alert(1)">Safe<script>alert(1)</script><img src="x" onerror="alert(1)"></p>',
    );

    expect(html).toContain("Safe");
    expect(html).not.toMatch(/script/i);
    expect(html).not.toMatch(/img/i);
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toMatch(/onclick/i);
    expect(html).not.toMatch(/style=/i);
    expect(html).not.toMatch(/class=/i);
  });

  it("forces target and rel on links", () => {
    const html = sanitizeRichText(
      '<a href="https://example.com" target="_self" rel="opener">link</a>',
    );

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('target="_self"');
    expect(html).not.toContain('rel="opener"');
  });

  it("rejects javascript, data, and vbscript hrefs", () => {
    const hrefs = [
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "vbscript:msgbox(1)",
    ];

    for (const href of hrefs) {
      const html = sanitizeRichText(`<a href="${href}">link</a>`);

      expect(html).not.toContain(href);
      expect(html).not.toMatch(/href="(?:javascript|data|vbscript):/i);
    }
  });

  it("is idempotent", () => {
    const once = sanitizeRichText(
      '<p><b>Bold</b><a href="https://example.com">link</a><script>bad()</script></p>',
    );

    expect(sanitizeRichText(once)).toBe(once);
  });

  it("sanitizes a resume document without mutating the input", () => {
    const doc: ResumeDocument = createEmptyResume();

    doc.summary.content =
      '<p>Intro<img src="x" onerror="alert(1)"></p>';
    doc.sections.experience.items = [
      {
        id: "exp-1",
        hidden: false,
        company: "Acme",
        position: "Engineer",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        summary:
          '<ul><li>Shipped things<script>alert(1)</script></li></ul>',
      },
    ];
    doc.customSections = [
      {
        id: "custom-1",
        title: "Talks",
        icon: "",
        columns: 1,
        hidden: false,
        showHeading: true,
        keepTogether: false,
        startOnNewPage: false,
        items: [
          {
            id: "custom-item-1",
            hidden: false,
            name: "Conference talk",
            description: '<p>Safe<script>alert(1)</script></p>',
          },
        ],
      },
    ];

    const clean = sanitizeResumeDocument(doc);

    expect(clean).not.toBe(doc);
    expect(clean.summary.content).not.toMatch(/img|onerror/i);
    expect(clean.summary.content).toContain("Intro");
    expect(clean.sections.experience.items[0].summary).not.toMatch(/script/i);
    expect(clean.sections.experience.items[0].summary).toContain("Shipped things");
    expect(clean.customSections[0].items[0].description).not.toMatch(/script/i);
    expect(clean.metadata).toEqual(doc.metadata);

    expect(doc.summary.content).toContain("<img");
    expect(doc.sections.experience.items[0].summary).toContain("<script");
  });
});
