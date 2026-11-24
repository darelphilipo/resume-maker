import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JdMatchDrawer } from "@/components/editor/JdMatchDrawer";
import { PrintPortal } from "@/components/preview/PrintPortal";
import { AtsTextView } from "@/components/preview/AtsTextView";
import { isResumeYearInRange } from "@/lib/date/month";
import { parsePastedResume } from "@/lib/import/pasteResume";
import { analyzeResumeLint } from "@/lib/lint/resumeLint";
import { matchJobKeywords } from "@/lib/keywords/jdMatch";
import { anonymizeResumeDoc } from "@/lib/privacy/anonymizeDoc";
import { highlightScanMetrics } from "@/lib/preview/scanMetrics";
import { createEmptyResume } from "@/lib/schema/defaults";
import { serializeJsonResume } from "@/lib/schema/jsonResume";
import {
  CertificationItemSchema,
  DEFAULT_SECTION_ORDER,
  ExperienceItemSchema,
  SkillItemSchema,
  TEMPLATE_IDS,
} from "@/lib/schema/resume.schema";
import { buildAtsText } from "@/lib/ats/atsText";
import { pageGeometry } from "@/lib/units/pageGeometry";
import { getTemplate } from "@/templates/registry";
import { HeaderSlot } from "@/templates/shared/HeaderSlot";

/**
 * Permanent gate for the five extreme-QA scenarios. These cases are deliberately
 * kept together so a future autonomous run cannot quietly drop one of them.
 * Pure/DOM behaviour lives here; the pixel geometry (page-break fill, real
 * horizontal overflow, right-aligned dates) is guarded in
 * `e2e/layout-consistency.spec.ts` because jsdom has no layout.
 */

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function allSectionsHidden() {
  const doc = createEmptyResume();

  for (const section of Object.values(doc.sections) as Array<{
    hidden: boolean;
  }>) {
    section.hidden = true;
  }

  return doc;
}

describe("extreme QA 2 — A4 ↔ Letter switches the page box and the @page rule", () => {
  it("updates both measurements and the runtime rule on one document", () => {
    const a4 = pageGeometry("a4", 14, 12);
    const letter = pageGeometry("letter", 14, 12);

    expect(a4.widthMm).toBe(210);
    expect(letter.widthMm).toBeCloseTo(215.9, 4);
    expect(a4.heightPx).toBeGreaterThan(letter.heightPx);

    const doc = createEmptyResume();
    const view = render(<PrintPortal doc={doc} pages={[["__header"]]} />);
    const portal = document.getElementById("print-portal");

    expect(
      portal?.querySelector("style[data-print-page-size]")?.textContent,
    ).toBe("@page { size: A4 portrait; margin: 0mm; }");
    expect(portal?.getAttribute("style")).toContain("--page-width: 210mm");

    doc.metadata.page.format = "letter";
    view.rerender(<PrintPortal doc={doc} pages={[["__header"]]} />);

    expect(
      portal?.querySelector("style[data-print-page-size]")?.textContent,
    ).toBe("@page { size: letter portrait; margin: 0mm; }");
    expect(portal?.getAttribute("style")).toContain("--page-width: 215.9mm");
    expect(portal?.getAttribute("style")).toContain("--page-height: 279.4mm");

    view.unmount();
  });
});

describe("extreme QA 3 — stress content renders through all six templates", () => {
  function stressDoc() {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.basics.headline = "Staff Engineer";
    doc.basics.email = "ada@example.com";
    doc.basics.website = {
      url: `https://example.com/${"a".repeat(90)}`,
      label: "",
    };
    doc.sections.skills.items = Array.from({ length: 4 }, (_, row) =>
      SkillItemSchema.parse({
        id: `skill-${row}`,
        name: `Category ${row + 1}`,
        keywords: Array.from(
          { length: 9 },
          (_, index) => `Keyword${row * 9 + index + 1}`,
        ),
      }),
    );
    doc.sections.certifications.items = Array.from({ length: 6 }, (_, index) =>
      CertificationItemSchema.parse({
        id: `cert-${index}`,
        name: `Certification ${index + 1} with a deliberately long descriptive title`,
        issuer: "Example Institute",
        date: "2024-01",
        url: "",
      }),
    );
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Engineer",
        startDate: "2020-01",
        endDate: "2024-01",
        summary: "<ul><li>Built resilient services.</li></ul>",
      }),
    ];

    return doc;
  }

  it("keeps the 90-char URL, 36 skills and 6 certifications in every layout", () => {
    const doc = stressDoc();
    const pages = [["__header", ...DEFAULT_SECTION_ORDER]];

    expect(TEMPLATE_IDS).toHaveLength(6);

    for (const id of TEMPLATE_IDS) {
      const Template = getTemplate(id).Component;
      const { container, unmount } = render(
        <Template doc={doc} pages={pages} pageIndex={0} />,
      );

      // The long URL stays an anchor with an absolute href; `onyx a` is the one
      // place `overflow-wrap: anywhere` is allowed (onyx-css.test.ts guards it).
      const hrefs = Array.from(container.querySelectorAll("a")).map((link) =>
        link.getAttribute("href"),
      );
      expect(
        hrefs.some((href) => href?.includes("a".repeat(90))),
        id,
      ).toBe(true);

      expect(screen.getByText("Keyword36"), id).toBeInTheDocument();
      expect(screen.getAllByText(/Certification [1-6] with/), id).toHaveLength(
        6,
      );
      // The right-aligned date range is a single readable span, not clipped or
      // split by the dense skills/certifications beside it.
      const dateRange = container.querySelector<HTMLElement>(
        '[data-section-id="experience"] .resume-date-range',
      );
      expect(dateRange, id).not.toBeNull();
      expect(dateRange?.textContent, id).toBe("Jan 2020 — Jan 2024");

      unmount();
    }
  });
});

describe("extreme QA 4 — blank / all-hidden resumes stay crash-free", () => {
  it("produces finite, NaN-free ATS, JD, lint, scan, anonymize and JSON output", () => {
    for (const doc of [createEmptyResume(), allSectionsHidden()]) {
      const ats = buildAtsText(doc);

      expect(ats).not.toMatch(/NaN|undefined/);
      expect(matchJobKeywords("", ats)).toEqual({
        matched: [],
        missing: [],
        coverage: 0,
      });

      const sample = matchJobKeywords("TypeScript, Kubernetes and Rust", ats);
      expect(sample.coverage).toBe(0);
      expect(sample.matched).toEqual([]);
      expect(sample.missing).toHaveLength(3);

      const lint = analyzeResumeLint(doc);
      expect(lint.bulletCount).toBe(0);
      expect(lint.issueCount).toBe(0);
      expect(lint.findings).toEqual([]);

      expect(highlightScanMetrics(doc.summary.content)).toBe(
        doc.summary.content,
      );

      const anonymized = anonymizeResumeDoc(doc);
      // Blanks stay blank rather than inventing an identity for an empty resume.
      expect(anonymized.basics.name).toBe(doc.basics.name);
      expect(anonymized.picture.hidden).toBe(true);
      expect(anonymized).not.toBe(doc);

      const exported = serializeJsonResume(doc);
      expect(exported).not.toMatch(/NaN|undefined/);
      expect(JSON.parse(exported)).toBeTypeOf("object");
    }
  });

  it("scores a blank resume at 0% (never NaN%) in the Match JD dialog", async () => {
    const user = userEvent.setup();
    window.matchMedia = ((query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia;

    render(<JdMatchDrawer doc={createEmptyResume()} compact />);
    await user.click(
      screen.getByRole("button", { name: "Match to a job description" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("No keywords yet");

    // `userEvent.type` trips vaul's pointer-capture stub inside a sheet, so the
    // desktop modal path and a direct change event are used here.
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "TypeScript, Kubernetes" },
    });

    expect(dialog).toHaveTextContent("0 of 2 keywords matched (0%)");
    expect(dialog).not.toHaveTextContent("NaN%");
    expect(
      screen.getByText("No job keywords found in your resume yet."),
    ).toBeInTheDocument();
  });

  it("renders the ATS tab for a blank resume without a nested crash", () => {
    expect(() => render(<AtsTextView doc={allSectionsHidden()} />)).not.toThrow();
    expect(
      screen.getByRole("button", { name: /Copy all/i }),
    ).toBeInTheDocument();
  });
});

describe("extreme QA 5 — malformed inputs fail gracefully", () => {
  it("rejects impossible, overlong and non-numeric resume years", () => {
    for (const invalid of ["0000", "99999", "abcd", "20"]) {
      expect(isResumeYearInRange(invalid), invalid).toBe(false);
    }
    expect(isResumeYearInRange("1950")).toBe(true);
    expect(isResumeYearInRange("2100")).toBe(true);
  });

  it("refuses punctuation-only launcher paste instead of importing garbage", () => {
    expect(parsePastedResume("--- !!! ???")).toBeNull();
    expect(parsePastedResume("   ")).toBeNull();
  });

  it("drops a broken picture URL while Hide picture is unchecked", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    doc.picture = { ...doc.picture, hidden: false, url: "not a url" };

    const { container } = render(<HeaderSlot doc={doc} />);
    const image = container.querySelector("img");

    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Ada Lovelace" }),
    ).toBeInTheDocument();
  });
});
