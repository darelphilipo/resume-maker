import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { createPresetResume, readPersistedJson, showTab } from "./helpers";

test.describe.configure({ timeout: 120_000 });

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

const ALLOWED_RULE_IDS = new Set<string>([]);

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();

  return results.violations
    .filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    )
    .filter((violation) => !ALLOWED_RULE_IDS.has(violation.id))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

async function expectNoSeriousViolations(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);

  expect(await seriousViolations(page)).toEqual([]);
}

async function pressTabUntil(
  page: Page,
  predicate: () => Promise<boolean>,
  limit = 80,
): Promise<void> {
  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press("Tab");

    if (await predicate()) {
      return;
    }
  }

  throw new Error("Could not reach the target element by keyboard.");
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} viewport`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("launcher has no critical or serious axe violations", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "Resume Maker" }),
      ).toBeVisible();

      await expectNoSeriousViolations(page);
    });

    test("each editor tab has no critical or serious axe violations", async ({
      page,
    }) => {
      await createPresetResume(page);

      for (const tab of ["Content", "Design", "Preview"] as const) {
        await showTab(page, tab);

        if (tab === "Preview") {
          await expect(
            page.locator("#panel-preview .resume-pages"),
          ).toBeVisible({ timeout: 20_000 });
        }

        await expectNoSeriousViolations(page);
      }
    });

    test("keyboard-only editing and global undo work", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: "Resume Maker" }),
      ).toBeVisible();

      await pressTabUntil(page, () =>
        page.evaluate(() => {
          const active = document.activeElement;

          return (
            active instanceof HTMLElement &&
            active.tagName === "BUTTON" &&
            (active.textContent ?? "").includes("Software Engineer")
          );
        }),
      );

      await page.keyboard.press("Enter");
      await page.waitForURL(/\/editor\/?\?id=/);
      await expect(
        page.getByRole("button", { name: "Save PDF" }),
      ).toBeVisible();

      await pressTabUntil(page, () =>
        page.evaluate(() => document.activeElement?.id === "basics-name"),
      );

      const nameInput = page.getByLabel("Name");

      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.insertText("Ada Lovelace");
      await expect(nameInput).toHaveValue("Ada Lovelace");
      await expect
        .poll(async () => readPersistedJson(page))
        .toContain("Ada Lovelace");
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();

      await pressTabUntil(page, () =>
        page.evaluate(() => document.activeElement?.tagName === "BUTTON"),
      );
      await page.keyboard.press("ControlOrMeta+z");
      await expect(nameInput).toHaveValue("Maya Chen");

      await nameInput.focus();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.type("Ada Lovelace");
      await page.keyboard.press("ControlOrMeta+z");
      await expect(nameInput).not.toHaveValue("Ada Lovelace");

      const missingNames = await page
        .locator("#panel-content")
        .evaluate((root) => {
          const selector =
            'a[href], button, input, select, textarea, [contenteditable="true"], [role="button"], [role="textbox"], [role="tab"]';

          const nameOf = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute("aria-label")?.trim();

            if (ariaLabel) {
              return ariaLabel;
            }

            const labelledBy =
              element.getAttribute("aria-labelledby")?.split(/\s+/) ?? [];
            const fromIds = labelledBy
              .map(
                (id) =>
                  element.ownerDocument.getElementById(id)?.textContent?.trim() ??
                  "",
              )
              .join(" ")
              .trim();

            if (fromIds !== "") {
              return fromIds;
            }

            if (
              element instanceof HTMLInputElement ||
              element instanceof HTMLSelectElement ||
              element instanceof HTMLTextAreaElement
            ) {
              const labels = element.labels
                ? Array.from(element.labels)
                    .map((label) => label.textContent?.trim() ?? "")
                    .join(" ")
                    .trim()
                : "";

              if (labels !== "") {
                return labels;
              }
            }

            const text = element.textContent?.trim() ?? "";

            if (text !== "") {
              return text;
            }

            return element.getAttribute("title")?.trim() ?? "";
          };

          const elements = Array.from(
            root.querySelectorAll<HTMLElement>(selector),
          );

          return elements
            .filter((element) => {
              if (element.closest('[aria-hidden="true"]')) {
                return false;
              }

              if (
                typeof element.checkVisibility === "function" &&
                !element.checkVisibility({ checkVisibilityCSS: true })
              ) {
                return false;
              }

              return nameOf(element) === "";
            })
            .map((element) => element.outerHTML.slice(0, 160));
        });

      expect(missingNames).toEqual([]);
    });
  });
}
