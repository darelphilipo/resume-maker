import { expect, test, type Page } from "@playwright/test";

type PrintCall = {
  title: string;
  portalExists: boolean;
  directChild: boolean;
  pageCount: number;
};

type PrintWindow = Window & { __printCalls: PrintCall[] };

test.describe.configure({ timeout: 120_000 });

async function stubPrint(page: Page, dispatchAfterPrint: boolean): Promise<void> {
  await page.addInitScript((shouldDispatch: boolean) => {
    const win = window as unknown as PrintWindow;

    win.__printCalls = [];
    window.print = () => {
      const portal = document.getElementById("print-portal");

      win.__printCalls.push({
        title: document.title,
        portalExists: portal !== null,
        directChild: portal?.parentElement === document.body,
        pageCount: portal
          ? portal.querySelectorAll(".resume-page").length
          : 0,
      });

      if (shouldDispatch) {
        window.setTimeout(() => {
          window.dispatchEvent(new Event("afterprint"));
        }, 0);
      }
    };
  }, dispatchAfterPrint);
}

async function readPrintCalls(page: Page): Promise<PrintCall[]> {
  return page.evaluate(
    () => (window as unknown as PrintWindow).__printCalls,
  );
}

async function openSoftwareEngineerResume(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /Software Engineer/ }).click();
  await page.waitForURL(/\/editor\?id=/);
  await expect(
    page.getByRole("button", { name: "Save PDF" }),
  ).toBeVisible();
}

async function showPreview(page: Page): Promise<void> {
  const previewTab = page.getByRole("tab", { name: "Preview" });

  if (await previewTab.isVisible()) {
    await previewTab.click();
  }

  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".resume-pages")).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(250);
}

test("prints the rendered pages and restores the title", async ({ page }) => {
  await stubPrint(page, true);
  await openSoftwareEngineerResume(page);
  await showPreview(page);

  const originalTitle = await page.title();
  const previewPageCount = await page
    .locator(".resume-pages .resume-page")
    .count();

  expect(previewPageCount).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Save PDF" }).click();

  await expect
    .poll(async () => (await readPrintCalls(page)).length)
    .toBe(1);

  const [call] = await readPrintCalls(page);

  expect(call.title).toBe("Maya-Chen-Resume");
  expect(call.portalExists).toBe(true);
  expect(call.directChild).toBe(true);
  expect(call.pageCount).toBe(previewPageCount);

  await expect(page.locator("#print-portal")).toHaveCount(0);
  await expect(page).toHaveTitle(originalTitle);
});

test("applies print media geometry to the print portal", async ({ page }) => {
  await stubPrint(page, false);
  await openSoftwareEngineerResume(page);
  await showPreview(page);

  await page.getByRole("button", { name: "Save PDF" }).click();

  await expect
    .poll(async () => (await readPrintCalls(page)).length)
    .toBe(1);

  await page.emulateMedia({ media: "print" });

  const metrics = await page.evaluate(() => {
    const appRoot = document.getElementById("app-root");
    const portal = document.getElementById("print-portal");
    const pages = portal
      ? Array.from(portal.querySelectorAll<HTMLElement>(".resume-page"))
      : [];
    const first = pages[0];
    const last = pages[pages.length - 1];

    if (!appRoot || !first || !last) {
      return null;
    }

    const firstStyle = getComputedStyle(first);
    const lastStyle = getComputedStyle(last);

    return {
      appDisplay: getComputedStyle(appRoot).display,
      width: Number.parseFloat(firstStyle.width),
      paddingTop: Number.parseFloat(firstStyle.paddingTop),
      paddingLeft: Number.parseFloat(firstStyle.paddingLeft),
      colorAdjust: [
        firstStyle.getPropertyValue("print-color-adjust"),
        firstStyle.getPropertyValue("-webkit-print-color-adjust"),
      ].join(" "),
      lastBreakAfter:
        lastStyle.breakAfter ||
        lastStyle.getPropertyValue("page-break-after"),
    };
  });

  expect(metrics).not.toBeNull();

  const result = metrics as NonNullable<typeof metrics>;

  expect(result.appDisplay).toBe("none");
  expect(Math.abs(result.width - 793.7)).toBeLessThan(1);
  expect(result.paddingTop).toBeCloseTo(12 * (4 / 3), 1);
  expect(result.paddingLeft).toBeCloseTo(14 * (4 / 3), 1);
  expect(result.colorAdjust).toContain("exact");
  expect(result.lastBreakAfter).toBe("auto");

  await page.evaluate(() => {
    window.dispatchEvent(new Event("afterprint"));
  });
});

test("keeps the print snapshot intact when print media hides the preview", async ({
  page,
}) => {
  await stubPrint(page, false);
  await openSoftwareEngineerResume(page);
  await showPreview(page);

  await page.getByRole("button", { name: "Save PDF" }).click();

  await expect
    .poll(async () => (await readPrintCalls(page)).length)
    .toBe(1);

  const portal = page.locator("#print-portal");
  const firstPage = portal.locator(".resume-page").first();

  const pageCountBefore = await portal.locator(".resume-page").count();
  const sectionCountBefore = await portal.locator(".resume-section").count();
  const firstPageTextBefore = await firstPage.evaluate(
    (element) => element.textContent?.length ?? 0,
  );

  expect(pageCountBefore).toBeGreaterThan(0);
  expect(sectionCountBefore).toBeGreaterThan(0);
  expect(firstPageTextBefore).toBeGreaterThan(0);

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(500);

  await expect(portal.locator(".resume-page")).toHaveCount(pageCountBefore);
  await expect(portal.locator(".resume-section")).toHaveCount(
    sectionCountBefore,
  );
  expect(
    await firstPage.evaluate(
      (element) => element.textContent?.length ?? 0,
    ),
  ).toBe(firstPageTextBefore);

  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => {
    window.dispatchEvent(new Event("afterprint"));
  });
});
