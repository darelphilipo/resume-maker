import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  createPresetResume,
  readPersistedDocument,
  showPreview,
  showTab,
} from "./helpers";

test.describe.configure({ timeout: 120_000 });

// Keep these in sync with the regressions they guard: preset alignment, white
// editor surfaces, the Month + Year selector, preview chrome placement,
// multi-page pagination, sticky desktop columns, and full-card hit targets /
// drawer triggers.
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const PRESET_SELECTOR =
  'section[aria-labelledby="launcher-scratch-heading"] ul[data-preset-list] button';

function presetButtons(page: Page): Locator {
  return page.locator(PRESET_SELECTOR);
}

async function expandSection(page: Page, id: string): Promise<void> {
  const row = page.locator(`button[aria-controls="section-body-${id}"]`);

  // Tucked optional sections are not mounted until the user reveals them.
  if ((await row.count()) === 0) {
    return;
  }

  if ((await row.getAttribute("aria-expanded")) !== "true") {
    await row.click();
  }
}

type ExperienceDocument = {
  sections: {
    experience: {
      items: Array<Record<string, unknown>>;
    };
  };
};

/**
 * Re-import the preset with enough long Experience entries to force several
 * pages. Mirrors the fixture in `mobile.spec.ts` so the pagination behaviour is
 * exercised at both viewports without a slow, entry-by-entry UI build-up.
 */
async function importMultiPageResume(page: Page): Promise<void> {
  const persisted = (await readPersistedDocument(page)) as
    | ExperienceDocument
    | null;

  if (persisted === null) {
    throw new Error("The preset resume was not persisted.");
  }

  const template = persisted.sections.experience.items[0];

  function bullets(entry: number): string {
    return `<ul>${[1, 2, 3, 4]
      .map(
        (line) =>
          `<li>Delivered measurable impact ${entry}.${line} across the platform and API layers while keeping the on-call rotation quiet.</li>`,
      )
      .join("")}</ul>`;
  }

  persisted.sections.experience.items = Array.from(
    { length: 8 },
    (_, index) => ({
      ...template,
      id: `experience-multipage-${index + 1}`,
      company: `Company ${index + 1}`,
      position: `Engineer ${index + 1}`,
      summary: bullets(index + 1),
    }),
  );

  await page.goto("/");
  await page.locator("#resume-json-input").setInputFiles({
    name: "multi-page.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(persisted)),
  });

  await page.waitForURL(/\/editor\/?\?id=/);
  await expect(page.getByRole("button", { name: "Save PDF" })).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} viewport`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("launcher presets share a row height and keep sibling opacity on click", async ({
      page,
    }) => {
      await page.goto("/");

      const buttons = presetButtons(page);
      await expect(buttons.first()).toBeVisible();
      expect(await buttons.count()).toBeGreaterThanOrEqual(2);

      const rects = await buttons.evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { top: rect.top, height: rect.height };
        }),
      );

      const heightMismatches: string[] = [];
      let sameRowPairs = 0;

      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          if (Math.abs(rects[i].top - rects[j].top) <= 2) {
            sameRowPairs += 1;
            const difference = Math.abs(rects[i].height - rects[j].height);

            if (difference > 2) {
              heightMismatches.push(`${i}/${j}: ${difference.toFixed(1)}px`);
            }
          }
        }
      }

      expect(heightMismatches).toEqual([]);
      // Below `sm` the grid is one column, so only desktop has same-row pairs.
      if (viewport.name === "desktop") {
        expect(sameRowPairs).toBeGreaterThan(0);
      }

      // React flushes discrete click updates synchronously, so reading in the
      // same task captures the transient "creating" state before the preset
      // navigates to the editor. Only the clicked card gets a pending treatment;
      // siblings must keep their original computed opacity.
      const snapshot = await page.evaluate((selector) => {
        const elements = Array.from(
          document.querySelectorAll<HTMLElement>(selector),
        );
        const before = elements.map(
          (element) => getComputedStyle(element).opacity,
        );

        elements[0].click();

        return {
          before,
          after: elements.map(
            (element) => getComputedStyle(element).opacity,
          ),
          busy: elements[0].getAttribute("aria-busy"),
        };
      }, PRESET_SELECTOR);

      expect(snapshot.busy).toBe("true");
      expect(snapshot.after).toEqual(snapshot.before);
    });

    test("Summary, Experience and Education editors use a white surface", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showTab(page, "Content");

      for (const id of ["summary", "experience", "education"]) {
        await expandSection(page, id);
      }

      const editors = page.locator("#panel-content .tiptap");
      await expect(editors.first()).toBeVisible();
      // TipTap mounts its editable surface in an effect; wait for every field.
      await expect.poll(() => editors.count()).toBeGreaterThanOrEqual(3);

      const backgrounds = await editors.evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).backgroundColor),
      );

      expect(backgrounds.length).toBeGreaterThanOrEqual(3);

      for (const background of backgrounds) {
        expect(background).toBe("rgb(255, 255, 255)");
      }
    });

    test("dated sections use the Month + Year selector, never input[type=month]", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showTab(page, "Content");

      for (const id of [
        "experience",
        "education",
        "projects",
        "certifications",
        "awards",
        "publications",
        "volunteer",
      ]) {
        await expandSection(page, id);
      }

      expect(
        await page.locator('#panel-content input[type="month"]').count(),
      ).toBe(0);
      expect(await page.locator('input[type="month"]').count()).toBe(0);
    });

    test("the Rich Text toolbar never clips its last control", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showTab(page, "Content");
      await expandSection(page, "experience");

      const toolbar = page.locator('#panel-content [role="toolbar"]').first();
      await expect(toolbar).toBeVisible();

      const metrics = await toolbar.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const buttons = Array.from(element.querySelectorAll("button")).map(
          (button) => button.getBoundingClientRect(),
        );

        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          boxRight: box.right,
          lastButtonRight: Math.max(...buttons.map((rect) => rect.right)),
          topSpread:
            Math.max(...buttons.map((rect) => rect.top)) -
            Math.min(...buttons.map((rect) => rect.top)),
          count: buttons.length,
        };
      });

      // Eight compact targets share one row in the 22rem Content column, and
      // none may hide behind an invisible horizontal overflow strip.
      expect(metrics.count).toBe(8);
      expect(metrics.topSpread).toBeLessThan(2);
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      expect(metrics.lastButtonRight).toBeLessThanOrEqual(
        metrics.boxRight + 0.5,
      );
    });

    test("expanded section cards keep every field inside the phone viewport", async ({
      page,
    }) => {
      test.skip(viewport.name !== "mobile", "phone-only card-width regression");

      await createPresetResume(page);
      await showTab(page, "Content");

      for (const id of [
        "profiles",
        "experience",
        "education",
        "projects",
        "skills",
        "certifications",
      ]) {
        await expandSection(page, id);
      }

      const metrics = await page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const overflow: Array<{
          section: string;
          kind: string;
          right: number;
          limit: number;
        }> = [];
        let fieldsetCount = 0;
        let inputCount = 0;

        for (const body of Array.from(
          document.querySelectorAll<HTMLElement>(
            '#panel-content [id^="section-body-"]',
          ),
        )) {
          const card = body.closest<HTMLElement>("li");
          const cardRight =
            card?.getBoundingClientRect().right ?? viewportWidth;
          const limit = Math.min(cardRight, viewportWidth);

          // The <li> itself must stay inside the viewport too; a card that
          // widens the column is the bug this guards.
          if (cardRight > viewportWidth + 0.5) {
            overflow.push({
              section: body.id,
              kind: "card",
              right: cardRight,
              limit: viewportWidth,
            });
          }

          for (const fieldset of Array.from(
            body.querySelectorAll<HTMLElement>("fieldset"),
          )) {
            fieldsetCount += 1;
            const right = fieldset.getBoundingClientRect().right;

            if (right > limit + 0.5) {
              overflow.push({
                section: body.id,
                kind: "fieldset",
                right,
                limit,
              });
            }
          }

          for (const input of Array.from(
            body.querySelectorAll<HTMLElement>("input, select"),
          )) {
            inputCount += 1;
            const right = input.getBoundingClientRect().right;

            if (right > limit + 0.5) {
              overflow.push({
                section: body.id,
                kind: input.tagName.toLowerCase(),
                right,
                limit,
              });
            }
          }
        }

        return { viewportWidth, fieldsetCount, inputCount, overflow };
      });

      expect(metrics.fieldsetCount).toBeGreaterThan(0);
      expect(metrics.inputCount).toBeGreaterThan(0);
      // `rect.right <= window.innerWidth` for every expanded card, fieldset,
      // input, and month/year select.
      expect(metrics.overflow).toEqual([]);
    });

    test("tapping a Design accent keeps the mobile shell locked and the nav flush", async ({
      page,
    }) => {
      test.skip(viewport.name !== "mobile", "phone-only shell lock regression");

      await createPresetResume(page);
      await showTab(page, "Design");

      // The accent radios are `sr-only` and the circular swatch has no visible
      // name, so tap its labelled target exactly as a user would. Changing the
      // accent also re-measures the canvas.
      await page.locator('label[for="accent-rose"]').click();
      await expect(page.locator("#accent-rose")).toBeChecked();

      const metrics = await page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>(
          'nav[aria-label="Editor panels"]',
        );
        const shell = document.querySelector<HTMLElement>("main")
          ?.parentElement;

        return {
          scrollY: window.scrollY,
          innerHeight: window.innerHeight,
          navBottom: nav?.getBoundingClientRect().bottom ?? null,
          documentScrollHeight: document.documentElement.scrollHeight,
          shellPosition: shell ? getComputedStyle(shell).position : null,
        };
      });

      // Focusing the hidden radio and re-measuring must never scroll the
      // document: the shell is fixed, so the nav stays at the viewport bottom.
      expect(metrics.shellPosition).toBe("fixed");
      expect(metrics.scrollY).toBe(0);
      expect(metrics.documentScrollHeight).toBeLessThanOrEqual(
        metrics.innerHeight + 1,
      );
      expect(metrics.navBottom).not.toBeNull();
      expect(
        Math.abs((metrics.navBottom as number) - metrics.innerHeight),
      ).toBeLessThanOrEqual(1);
    });

    test("section action buttons stay inside the expanded card", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showTab(page, "Content");

      for (const id of ["profiles", "experience"]) {
        await expandSection(page, id);
      }

      const overflow = await page.evaluate(() => {
        const issues: Array<{
          section: string;
          label: string;
          right: number;
          limit: number;
        }> = [];

        for (const body of Array.from(
          document.querySelectorAll<HTMLElement>(
            '#panel-content [id^="section-body-"]',
          ),
        )) {
          const card = body.closest<HTMLElement>("li");
          const limit = Math.min(
            card?.getBoundingClientRect().right ?? window.innerWidth,
            window.innerWidth,
          );
          const grid = body.querySelector<HTMLElement>(":scope > div.grid");

          if (!grid) {
            continue;
          }

          if (grid.scrollWidth > grid.clientWidth + 1) {
            issues.push({
              section: body.id,
              label: "grid",
              right: grid.scrollWidth,
              limit: grid.clientWidth,
            });
          }

          for (const button of Array.from(
            grid.querySelectorAll<HTMLElement>("button"),
          )) {
            const right = button.getBoundingClientRect().right;

            if (right > limit + 0.5) {
              issues.push({
                section: body.id,
                label:
                  button.getAttribute("aria-label") ??
                  (button.textContent ?? "").trim(),
                right,
                limit,
              });
            }
          }
        }

        return issues;
      });

      // Hide / Move up / Move down / Open section editor must never clip off
      // the right border at 390px or in the 22rem desktop column.
      expect(overflow).toEqual([]);
    });

    test("the page-count badge never overlaps the resume name", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showPreview(page);

      const overlaps = await page.evaluate(() => {
        const modeHeader = document.querySelector<HTMLElement>(
          "[data-preview-mode-header]",
        );
        const badge = modeHeader?.querySelector<HTMLElement>(
          "[data-page-overflow], [data-preview-page-label]",
        );
        const name = document.querySelector<HTMLElement>(
          "#panel-preview .resume-page .resume-name",
        );

        if (!badge || !name) {
          return null;
        }

        const a = badge.getBoundingClientRect();
        const b = name.getBoundingClientRect();

        return !(
          a.right <= b.left ||
          a.left >= b.right ||
          a.bottom <= b.top ||
          a.top >= b.bottom
        );
      });

      expect(overlaps).not.toBeNull();
      expect(overlaps).toBe(false);
    });

    test("multi-page pagination fills Page 1 before breaking an entry", async ({
      page,
    }) => {
      await createPresetResume(page);
      await importMultiPageResume(page);
      await showPreview(page);

      await expect
        .poll(
          async () => page.locator("#panel-preview .resume-page").count(),
          { timeout: 20_000 },
        )
        .toBeGreaterThanOrEqual(2);

      const pagination = await page.evaluate(() => {
        const pages = Array.from(
          document.querySelectorAll<HTMLElement>("#panel-preview .resume-page"),
        );
        const experience = (target: HTMLElement) =>
          target.querySelector<HTMLElement>(
            '.resume-section[data-section-id="experience"]',
          );

        const first = pages[0];
        const firstSection = first ? experience(first) : null;
        const contentHeight =
          first?.querySelector<HTMLElement>(".onyx")?.getBoundingClientRect()
            .height ?? 0;
        const pageHeight = first?.getBoundingClientRect().height ?? 0;

        return {
          pageCount: pages.length,
          firstEntries:
            firstSection?.querySelectorAll(".resume-entry").length ?? 0,
          firstHasHeading: Boolean(
            firstSection?.querySelector(".resume-section-heading"),
          ),
          laterEntries: pages
            .slice(1)
            .reduce(
              (sum, target) =>
                sum +
                (experience(target)?.querySelectorAll(".resume-entry")
                  .length ?? 0),
              0,
            ),
          fillRatio: pageHeight > 0 ? contentHeight / pageHeight : 0,
        };
      });

      expect(pagination.pageCount).toBeGreaterThanOrEqual(2);
      // The heading is fused to its first entry (keep-with-next), so Page 1
      // always owns it even when later entries spill onto new pages.
      expect(pagination.firstHasHeading).toBe(true);
      // The old bug measured a multi-entry section as one atomic block and left
      // ~80% of Page 1 blank. Entry-by-entry packing fills it instead.
      expect(pagination.firstEntries).toBeGreaterThanOrEqual(2);
      expect(pagination.fillRatio).toBeGreaterThan(0.5);
      // Overflow entries continue onto later pages instead of being dropped.
      expect(pagination.laterEntries).toBeGreaterThan(0);
    });

    test("plain wheel scrolling is not intercepted by preview zoom", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showPreview(page);

      const canvas = page.locator(".react-transform-wrapper").first();
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      await page.evaluate(() => {
        const probe = window as Window & { preventedWheels?: number };

        probe.preventedWheels = 0;
        document.addEventListener(
          "wheel",
          (event) => {
            if (event.defaultPrevented) {
              probe.preventedWheels = (probe.preventedWheels ?? 0) + 1;
            }
          },
          { passive: true },
        );
      });

      await page.mouse.move(
        box!.x + box!.width / 2,
        box!.y + box!.height / 2,
      );
      await page.mouse.wheel(0, 240);

      expect(
        await page.evaluate(
          () =>
            (window as Window & { preventedWheels?: number }).preventedWheels,
        ),
      ).toBe(0);
    });

    test("preview chrome sits above Page 1 without covering it", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showPreview(page);

      const geometry = await page.evaluate(() => {
        const modeHeader = document.querySelector<HTMLElement>(
          "[data-preview-mode-header]",
        );
        const name = document.querySelector<HTMLElement>(
          "#panel-preview .resume-page .resume-name",
        );

        if (!modeHeader || !name) {
          return null;
        }

        const mode = modeHeader.getBoundingClientRect();

        return {
          modeTop: mode.top,
          modeBottom: mode.bottom,
          nameTop: name.getBoundingClientRect().top,
          modePosition: getComputedStyle(modeHeader).position,
        };
      });

      expect(geometry).not.toBeNull();
      const result = geometry as NonNullable<typeof geometry>;

      if (viewport.name !== "mobile") {
        expect(result.modePosition).toBe("sticky");
      }
      // The single preview bar occupies normal flow above the paper, so Page 1
      // starts below it instead of being covered at rest.
      expect(result.nameTop).toBeGreaterThanOrEqual(result.modeBottom);
    });

    test("desktop columns scroll independently without a second page scrollbar", async ({
      page,
    }) => {
      test.skip(viewport.name === "mobile", "desktop column layout only");

      await createPresetResume(page);
      await showPreview(page);

      // Give the Content column something to scroll.
      for (const id of [
        "summary",
        "experience",
        "education",
        "projects",
        "skills",
        "certifications",
      ]) {
        await expandSection(page, id);
      }

      const metrics = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>("main");
        const shell = main?.parentElement;
        const panels = Array.from(
          document.querySelectorAll<HTMLElement>(
            "#panel-content, #panel-preview, #panel-design",
          ),
        );
        const content = document.querySelector<HTMLElement>("#panel-content");

        if (!main || !shell || !content || panels.length !== 3) {
          return null;
        }

        content.scrollTop = 400;

        return {
          documentScrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
          shellOverflow: getComputedStyle(shell).overflowY,
          mainOverflow: getComputedStyle(main).overflowY,
          contentTop: content.scrollTop,
          panels: panels.map((panel) => ({
            id: panel.id,
            top: panel.getBoundingClientRect().top,
            bottom: panel.getBoundingClientRect().bottom,
            overflowY: getComputedStyle(panel).overflowY,
          })),
        };
      });

      expect(metrics).not.toBeNull();

      const result = metrics as NonNullable<typeof metrics>;

      // The document no longer scrolls: one viewport-tall shell, a clipping
      // grid, and exactly one scrollbar per column.
      expect(result.documentScrollHeight).toBeLessThanOrEqual(
        result.innerHeight + 1,
      );
      expect(result.shellOverflow).toBe("hidden");
      expect(result.mainOverflow).toBe("hidden");
      expect(result.contentTop).toBeGreaterThan(0);

      for (const panel of result.panels) {
        expect(panel.overflowY).toBe("auto");
        expect(panel.top).toBeGreaterThanOrEqual(0);
        expect(panel.top).toBeLessThan(result.innerHeight);
        expect(panel.bottom).toBeLessThanOrEqual(result.innerHeight + 1);
      }
    });

    test("Studio Sidebar lays out both columns on Page 1", async ({ page }) => {
      await createPresetResume(page);

      await showTab(page, "Design");
      await page.getByRole("radio", { name: /Studio Sidebar/ }).click();
      await showPreview(page);

      const columns = await page.evaluate(() => {
        const firstPage = document.querySelector<HTMLElement>(
          "#panel-preview .resume-page",
        );
        const main = firstPage?.querySelector<HTMLElement>(".studio-main");
        const sidebar = firstPage?.querySelector<HTMLElement>(".studio-sidebar");

        if (!firstPage || !main || !sidebar) {
          return null;
        }

        const mainBox = main.getBoundingClientRect();
        const sidebarBox = sidebar.getBoundingClientRect();

        return {
          display: getComputedStyle(main.parentElement as HTMLElement).display,
          mainWidth: mainBox.width,
          sidebarWidth: sidebarBox.width,
          sidebarStartsRight: sidebarBox.left >= mainBox.left,
          oppositeSides: sidebarBox.left >= mainBox.right - 1,
        };
      });

      expect(columns).not.toBeNull();
      const result = columns as NonNullable<typeof columns>;

      expect(result.display).toBe("grid");
      expect(result.mainWidth).toBeGreaterThan(0);
      expect(result.sidebarWidth).toBeGreaterThan(0);
      expect(result.sidebarStartsRight).toBe(true);
      expect(result.oppositeSides).toBe(true);
    });

    test("the Letter card body switches paper size and the JD trigger scores keywords", async ({
      page,
    }) => {
      await createPresetResume(page);

      await showTab(page, "Design");

      const a4 = page.locator("#page-format-a4");
      const letter = page.locator("#page-format-letter");

      // Guarantee we actually switch formats rather than clicking the current one.
      if (await letter.isChecked()) {
        await page.getByText("210 × 297 mm", { exact: true }).click();
        await expect(a4).toBeChecked();
      }

      // Click the detail span (the card body), not the radio dot.
      await page.getByText("8.5 × 11 in", { exact: true }).click();
      await expect(letter).toBeChecked();

      await showTab(page, "Content");
      const trigger = page.getByRole("button", {
        name: "Match to a job description",
      });

      // The compact trigger must share the Content heading's row, not wrap to
      // a second line in the 390px Content column.
      const headingBox = await page
        .getByRole("heading", { name: "Content" })
        .boundingBox();
      const triggerBox = await trigger.boundingBox();
      expect(headingBox).not.toBeNull();
      expect(triggerBox).not.toBeNull();
      const headingMid = (headingBox as NonNullable<typeof headingBox>).y +
        (headingBox as NonNullable<typeof headingBox>).height / 2;
      const triggerMid = (triggerBox as NonNullable<typeof triggerBox>).y +
        (triggerBox as NonNullable<typeof triggerBox>).height / 2;
      expect(Math.abs(headingMid - triggerMid)).toBeLessThan(12);

      await trigger.click();

      const dialog = page.getByRole("dialog");

      await expect(dialog).toBeVisible();
      // `toBeVisible` ignores CSS transforms, so measure the sheet itself: with
      // vaul snap points a short drawer is translated ~40% of the viewport down
      // and only a sliver is actually on screen, which looks like it never
      // opened. The compact JD dialog opts out and must be substantially visible.
      // Poll through vaul's 500ms slide-in so the measurement is taken after
      // the sheet settles, not while it is still animating from below.
      await expect
        .poll(async () => {
          const box = await dialog.boundingBox();
          const viewport = page.viewportSize();

          if (!box || !viewport) {
            return 0;
          }

          return (
            Math.min(box.y + box.height, viewport.height) - Math.max(box.y, 0)
          );
        })
        .toBeGreaterThan(160);

      const description = dialog.getByLabel("Job description");
      await expect(description).toBeVisible();

      // The Software Engineer preset already lists TypeScript and Kubernetes,
      // but not Cobol. Assert the drawer actually scores the pasted posting into
      // Matched / Missing chips, not just that it opened.
      await description.fill("TypeScript, Kubernetes, and Cobol");

      await expect(dialog.getByText(/keywords matched/)).toBeVisible();
      const matched = dialog.getByRole("list", { name: "Matched" });
      const missing = dialog.getByRole("list", { name: "Missing" });

      await expect(matched.getByText("typescript")).toBeVisible();
      await expect(matched.getByText("kubernetes")).toBeVisible();
      await expect(missing.getByText("cobol")).toBeVisible();

      // One tap on X must dismiss the sheet outright; a tap claimed by vaul's
      // drag handler used to snap the drawer shorter and keep it open.
      await dialog.getByRole("button", { name: "Close drawer" }).click();
      await expect(dialog).toBeHidden();
    });
  });
}

test.describe("tall tablet preview", () => {
  // 1023px is the widest layout that still uses the mobile tab shell. The page
  // is capped at 100% there, so the fitted canvas is narrower than the preview
  // scroller and must be centred instead of hugging the left edge.
  test.use({ viewport: { width: 1023, height: 1600 } });

  test("centres the fitted page, ends the gray desk with it, and pins the nav", async ({
    page,
  }) => {
    await createPresetResume(page);
    await showPreview(page);

    const metrics = await page.evaluate(() => {
      const scroll = document.querySelector<HTMLElement>(
        "[data-canvas-scroll]",
      );
      const canvas = document.querySelector<HTMLElement>(
        ".react-transform-component",
      );
      const desk = document.querySelector<HTMLElement>("[data-canvas-desk]");
      const nav = document.querySelector<HTMLElement>(".mobile-bottom-bar");

      if (!scroll || !canvas || !desk || !nav) {
        return null;
      }

      const scrollRect = scroll.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const deskRect = desk.getBoundingClientRect();

      return {
        scrollLeft: scrollRect.left,
        scrollRight: scrollRect.right,
        scrollBottom: scrollRect.bottom,
        canvasLeft: canvasRect.left,
        canvasRight: canvasRect.right,
        canvasTop: canvasRect.top,
        canvasBottom: canvasRect.bottom,
        deskTop: deskRect.top,
        deskBottom: deskRect.bottom,
        navBottom: nav.getBoundingClientRect().bottom,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
        documentOverflow:
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight,
      };
    });

    expect(metrics).not.toBeNull();

    const result = metrics as NonNullable<typeof metrics>;
    const leftGap = result.canvasLeft - result.scrollLeft;
    const rightGap = result.scrollRight - result.canvasRight;

    // Equal breathing room on both sides instead of a gray strip on the right.
    expect(leftGap).toBeGreaterThan(1);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);

    // The backdrop wraps the one-page stack plus the scroller's vertical
    // padding, so Page 1 never spills past the gray edge. It must still stop at
    // the stack instead of painting a full-panel void down to the tab bar.
    expect(result.deskTop).toBeLessThanOrEqual(result.canvasTop + 0.5);
    expect(result.deskBottom).toBeGreaterThanOrEqual(result.canvasBottom - 0.5);
    expect(result.deskBottom - result.canvasBottom).toBeLessThanOrEqual(25);
    expect(result.deskBottom).toBeLessThan(result.scrollBottom - 50);

    // The fixed shell still spans the visual viewport with no body scroll.
    expect(result.scrollY).toBe(0);
    expect(result.documentOverflow).toBeLessThanOrEqual(1);
    expect(Math.abs(result.navBottom - result.innerHeight)).toBeLessThanOrEqual(
      1,
    );
  });
});
