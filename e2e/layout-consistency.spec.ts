import { expect, test, type Locator, type Page } from "@playwright/test";

import { createPresetResume, showPreview, showTab } from "./helpers";

test.describe.configure({ timeout: 120_000 });

// Keep these in sync with the regressions they guard: preset alignment, white
// editor surfaces, the Month + Year selector, preview chrome placement, sticky
// desktop columns, and full-card hit targets / drawer triggers.
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const PRESET_SELECTOR =
  'section[aria-labelledby="launcher-scratch-heading"] ul button';

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

    test("the page-count badge never overlaps the resume name", async ({
      page,
    }) => {
      await createPresetResume(page);
      await showPreview(page);

      const overlaps = await page.evaluate(() => {
        const toolbar = document.querySelector<HTMLElement>(
          "[data-canvas-toolbar]",
        );
        const badge = Array.from(
          toolbar?.querySelectorAll("span") ?? [],
        ).find((element) =>
          /^\d+ pages?$/.test((element.textContent ?? "").trim()),
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

    test("scrolling Content keeps the preview panel inside the viewport", async ({
      page,
    }) => {
      test.skip(viewport.name === "mobile", "desktop sticky columns only");

      await createPresetResume(page);
      await showPreview(page);

      // Give the sticky panel a runway: a long Content column makes <main> tall.
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

      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(0);

      const metrics = await page.evaluate(() => {
        const panel = document.querySelector<HTMLElement>("#panel-preview");
        const header = document.querySelector<HTMLElement>("header");

        if (!panel || !header) {
          return null;
        }

        const rect = panel.getBoundingClientRect();

        return {
          top: rect.top,
          bottom: rect.bottom,
          headerBottom: header.getBoundingClientRect().bottom,
          innerHeight: window.innerHeight,
        };
      });

      expect(metrics).not.toBeNull();

      const result = metrics as NonNullable<typeof metrics>;

      // A non-sticky panel would have scrolled above the viewport here.
      expect(result.top).toBeGreaterThanOrEqual(0);
      expect(result.top).toBeLessThan(result.innerHeight);
      expect(result.bottom).toBeGreaterThan(result.headerBottom);
    });

    test("the Letter card body switches paper size and the JD trigger opens its drawer", async ({
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
      await page
        .getByRole("button", { name: "Match to a job description" })
        .click();

      const dialog = page.getByRole("dialog");

      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel("Job description")).toBeVisible();
    });
  });
}
