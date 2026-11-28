import { expect, test, type Page } from "@playwright/test";

import {
  createPresetResume,
  readPersistedDocument,
  showPreview,
  showTab,
} from "./helpers";

/**
 * Real PDF-output regressions. Every assertion runs against bytes produced by
 * Chromium's `page.pdf()` and parsed with PDF.js, so the suite sees the same
 * pages and text a recruiter downloads instead of a DOM approximation.
 *
 * `page.pdf()` is Chromium-only. WebKit still runs the print-CSS half of the
 * `6s Scan` regression below, because that lens must never reach the portal.
 */
test.describe.configure({ timeout: 180_000 });

const PDF_ONLY = "page.pdf() is Chromium-only";

/** Mirrors PRINT_JOB_RELEASE_MS in `PrintTriggerButton.tsx`. */
const PRINT_JOB_RELEASE_MS = 2_000;

/** Minimum extracted characters before a PDF page is considered non-blank. */
const MIN_PAGE_TEXT = 40;

/**
 * Headless browsers never open a print dialog, so the captured portal would be
 * dropped by the 2s fallback timer before `page.pdf()` reads the DOM. Suppress
 * that one timer and stub `window.print()` so the portal stays mounted for the
 * whole assertion. `page.pdf()` prints the live DOM itself.
 */
async function keepPrintPortalMounted(page: Page): Promise<void> {
  await page.addInitScript((releaseMs: number) => {
    const originalSetTimeout = window.setTimeout.bind(window);

    window.setTimeout = ((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) =>
      timeout === releaseMs
        ? 0
        : originalSetTimeout(handler, timeout, ...args)) as typeof window.setTimeout;

    window.print = () => {};
  }, PRINT_JOB_RELEASE_MS);
}

type PdfText = {
  numPages: number;
  /** One whitespace-normalized text blob per PDF page. */
  pages: string[];
};

/**
 * Parse the exported bytes with PDF.js. The legacy build keeps the fake worker
 * in-thread, so no separate worker asset or `workerSrc` is needed under Node.
 */
async function readPdf(bytes: Uint8Array): Promise<PdfText> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: bytes,
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const pdf = await task.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const pdfPage = await pdf.getPage(pageNumber);
      const content = await pdfPage.getTextContent();

      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      );
    }

    return { numPages: pdf.numPages, pages };
  } finally {
    await pdf.destroy();
  }
}

/** Click Save PDF, wait for the captured portal, and print the live DOM. */
async function exportPdf(page: Page): Promise<Uint8Array> {
  const save = page.getByRole("button", { name: "Save PDF" });

  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.locator("#print-portal .resume-page").first()).toBeAttached();

  const buffer = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
  });

  return new Uint8Array(buffer);
}

/**
 * Open Preview and wait for a real measured page stack (the placeholder during
 * a re-measure also renders one empty page). Returns the preview page count.
 */
async function awaitPreview(page: Page, minimumPages = 1): Promise<number> {
  await showPreview(page);
  await expect(
    page.locator("#panel-preview .resume-page .resume-name").first(),
  ).toBeVisible({ timeout: 20_000 });

  if (minimumPages > 1) {
    await expect
      .poll(
        async () => page.locator("#panel-preview .resume-page").count(),
        { timeout: 30_000 },
      )
      .toBeGreaterThanOrEqual(minimumPages);
  }

  // Let the fit pass and font metrics settle before the page list is read.
  await page.waitForTimeout(300);

  return page.locator("#panel-preview .resume-page").count();
}

async function setPaperSize(
  page: Page,
  format: "a4" | "letter",
): Promise<void> {
  await showTab(page, "Design");
  await page
    .getByText(format === "a4" ? "210 × 297 mm" : "8.5 × 11 in", {
      exact: true,
    })
    .click();
  await expect(page.locator(`#page-format-${format}`)).toBeChecked();
}

async function setTemplate(page: Page, name: RegExp): Promise<void> {
  await showTab(page, "Design");
  await page.getByRole("radio", { name }).click();
}

type StoredSection = {
  hidden?: boolean;
  items: Array<Record<string, unknown>>;
};

type StoredResume = {
  sections: {
    experience: StoredSection;
    certifications: StoredSection;
    awards: StoredSection;
    [key: string]: StoredSection;
  };
};

/**
 * Re-import the preset with enough content to force several pages: eight
 * experience roles, six certifications, and three awards. Mirrors the dense
 * fixture used by `mobile.spec.ts`/`layout-consistency.spec.ts`, then adds the
 * compact sections that expose the Studio Sidebar's page-2 packing.
 */
async function importDenseResume(page: Page): Promise<void> {
  const persisted = (await readPersistedDocument(page)) as StoredResume | null;

  if (persisted === null) {
    throw new Error("The preset resume was not persisted.");
  }

  const experienceTemplate = persisted.sections.experience.items[0];

  persisted.sections.experience.items = Array.from(
    { length: 8 },
    (_, index) => ({
      ...experienceTemplate,
      id: `experience-dense-${index + 1}`,
      company: `Company ${index + 1}`,
      position: `Engineer ${index + 1}`,
      summary: `<ul>${[1, 2, 3, 4]
        .map(
          (line) =>
            `<li>Delivered measurable impact ${index + 1}.${line} across the platform and API layers while keeping the on-call rotation quiet.</li>`,
        )
        .join("")}</ul>`,
    }),
  );

  persisted.sections.certifications.hidden = false;
  persisted.sections.certifications.items = Array.from(
    { length: 6 },
    (_, index) => ({
      id: `certification-dense-${index + 1}`,
      hidden: false,
      name: `Certification ${index + 1} — Platform Engineering`,
      issuer: "Example Institute",
      date: "2024-01",
      url: "",
    }),
  );

  persisted.sections.awards.hidden = false;
  persisted.sections.awards.items = Array.from(
    { length: 3 },
    (_, index) => ({
      id: `award-dense-${index + 1}`,
      hidden: false,
      title: `Award ${index + 1} for reliable platform delivery`,
      awarder: "Example Foundation",
      date: "2023-06",
      summary:
        "<p>Recognised for measurable reliability and incident-response work.</p>",
    }),
  );

  await page.goto("/");
  await page.locator("#resume-json-input").setInputFiles({
    name: "dense-multi-page.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(persisted)),
  });
  await page.waitForURL(/\/editor\/?\?id=/);
  await expect(page.getByRole("button", { name: "Save PDF" })).toBeVisible();
}

for (const format of ["a4", "letter"] as const) {
  test(`Software Engineer preset exports exactly one ${format.toUpperCase()} page`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", PDF_ONLY);

    await keepPrintPortalMounted(page);
    await createPresetResume(page);

    if (format === "letter") {
      await setPaperSize(page, format);
    }

    const previewPages = await awaitPreview(page);
    expect(previewPages).toBe(1);

    const pdf = await readPdf(await exportPdf(page));

    expect(pdf.numPages).toBe(1);
    expect(pdf.pages).toHaveLength(1);
    expect(pdf.pages[0].length).toBeGreaterThan(200);
    expect(pdf.pages[0]).toContain("Maya Chen");
    // Section headings are uppercased by the template's CSS, so the PDF text
    // layer carries "EXPERIENCE"; match the heading case-insensitively.
    expect(pdf.pages[0]).toMatch(/experience/i);
    expect(pdf.pages[0]).toMatch(/education/i);
    expect(pdf.pages[0]).toMatch(/skills/i);
  });
}

test.describe("cold mobile print from Content", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("exports a non-blank page without visiting Preview", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", PDF_ONLY);

    await keepPrintPortalMounted(page);
    await createPresetResume(page);

    // The regression: the editor lands on Content, so the Preview panel is
    // display:none. Save PDF must still capture a real page, never a blank one.
    await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const pdf = await readPdf(await exportPdf(page));

    expect(pdf.numPages).toBe(1);
    expect(pdf.pages[0].length).toBeGreaterThan(200);
    expect(pdf.pages[0]).toContain("Maya Chen");
  });
});

for (const format of ["a4", "letter"] as const) {
  test(`dense Studio Sidebar keeps preview/PDF parity on ${format.toUpperCase()}`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", PDF_ONLY);

    await keepPrintPortalMounted(page);
    await createPresetResume(page);
    await importDenseResume(page);

    await setTemplate(page, /Studio Sidebar/);

    if (format === "letter") {
      await setPaperSize(page, format);
    }

    const previewPages = await awaitPreview(page, 2);
    expect(previewPages).toBeGreaterThanOrEqual(2);

    const pdf = await readPdf(await exportPdf(page));

    expect(pdf.numPages).toBe(previewPages);
    expect(pdf.pages).toHaveLength(previewPages);

    for (const [index, text] of pdf.pages.entries()) {
      expect(text.length, `PDF page ${index + 1} is blank`).toBeGreaterThan(
        MIN_PAGE_TEXT,
      );
    }

    // Heading case depends on the template (uppercased by default).
    expect(pdf.pages.join(" ")).toMatch(/awards/i);
  });
}

const SINGLE_COLUMN_TEMPLATES = [
  { label: "Engineering Classic", name: /Engineering Classic/ },
  { label: "Compact 1-Pager", name: /Compact 1-Pager/ },
] as const;

for (const template of SINGLE_COLUMN_TEMPLATES) {
  test(`dense ${template.label} keeps preview/PDF parity with no blank pages`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", PDF_ONLY);

    await keepPrintPortalMounted(page);
    await createPresetResume(page);
    await importDenseResume(page);

    await setTemplate(page, template.name);

    const previewPages = await awaitPreview(page, 2);
    expect(previewPages).toBeGreaterThanOrEqual(2);

    const pdf = await readPdf(await exportPdf(page));

    expect(pdf.numPages).toBe(previewPages);
    expect(pdf.pages).toHaveLength(previewPages);

    for (const [index, text] of pdf.pages.entries()) {
      expect(text.length, `PDF page ${index + 1} is blank`).toBeGreaterThan(
        MIN_PAGE_TEXT,
      );
    }

    // No blank trailing sheet after the last packed page.
    expect(pdf.pages[pdf.pages.length - 1].length).toBeGreaterThan(
      MIN_PAGE_TEXT,
    );
  });
}

test("Anonymize exports placeholders and no real identity data", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", PDF_ONLY);

  await keepPrintPortalMounted(page);
  await createPresetResume(page);
  await awaitPreview(page);

  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("switch", { name: "Anonymize" }).click();
  await page.getByRole("button", { name: "Close review tools" }).click();

  // Wait for the display-only clone to reach the canvas before printing.
  await expect(page.locator("#panel-preview .resume-name").first()).toHaveText(
    "Alex Taylor",
  );

  const pdf = await readPdf(await exportPdf(page));
  const allText = pdf.pages.join("\n");
  const lower = allText.toLowerCase();

  expect(allText).toContain("Alex Taylor");
  expect(allText).toContain("Company A");
  expect(lower).not.toContain("maya chen");
  expect(lower).not.toContain("maya.chen@example.com");
  expect(lower).not.toContain("northwind");
});

test("6s Scan stays out of the print portal and print CSS", async ({
  page,
}) => {
  await keepPrintPortalMounted(page);
  await createPresetResume(page);
  await awaitPreview(page);

  await page.getByRole("button", { name: "Review" }).click();
  await page.getByRole("switch", { name: "6s Scan" }).click();
  await page.getByRole("button", { name: "Close review tools" }).click();

  // Sanity: the lens is active on the screen preview.
  await expect(page.locator("#panel-preview .resume-pages")).toHaveClass(
    /resume-scan/,
  );

  await page.getByRole("button", { name: "Save PDF" }).click();
  await expect(page.locator("#print-portal .resume-page").first()).toBeAttached();

  // This half runs on both Chromium and WebKit: the print stylesheet must not
  // carry the scan class, and every page must shrink to its content instead of
  // staying a full sheet tall (the iOS alternating-blank-page bug).
  await page.emulateMedia({ media: "print" });

  const result = await page.evaluate(() => {
    const portal = document.getElementById("print-portal");
    const pages = Array.from(
      portal?.querySelectorAll<HTMLElement>(".resume-page") ?? [],
    );
    const rawHeight =
      portal === null
        ? ""
        : getComputedStyle(portal).getPropertyValue("--page-height").trim();
    const pageHeightMm = Number.parseFloat(rawHeight) || 297;

    return {
      portalHasScanClass: portal?.classList.contains("resume-scan") ?? false,
      scanDescendant: portal?.querySelector(".resume-scan") !== null,
      pageHeightPx: (pageHeightMm * 96) / 25.4,
      pages: pages.map((paper) => ({
        minHeight: getComputedStyle(paper).minHeight,
        height: paper.getBoundingClientRect().height,
      })),
    };
  });

  expect(result.portalHasScanClass).toBe(false);
  expect(result.scanDescendant).toBe(false);
  expect(result.pages.length).toBeGreaterThan(0);

  for (const paper of result.pages) {
    expect(paper.minHeight).toBe("0px");
    expect(paper.height).toBeLessThanOrEqual(result.pageHeightPx + 1);
  }
});
