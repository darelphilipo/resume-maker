import { devices, expect, test, type Page } from "@playwright/test";

import {
  createPresetResume,
  readPersistedDocument,
  readPrintCalls,
  showTab,
  stubPrint,
} from "./helpers";

// Spreading devices["iPhone 14"] wholesale would also carry its
// `defaultBrowserType: "webkit"`, which makes Playwright launch WebKit even
// inside the chromium project (and hides the CDP session the touch test needs).
const IPHONE_14 = devices["iPhone 14"];

test.use({
  viewport: IPHONE_14.viewport,
  deviceScaleFactor: IPHONE_14.deviceScaleFactor,
  isMobile: IPHONE_14.isMobile,
  hasTouch: IPHONE_14.hasTouch,
  userAgent: IPHONE_14.userAgent,
});

test.describe.configure({ timeout: 120_000 });

const BAR_SELECTOR = ".mobile-bottom-bar";

type BarMetrics = {
  top: number;
  bottom: number;
  height: number;
  position: string;
  visibility: string;
  display: string;
  innerHeight: number;
  previousTag: string | null;
};

async function readBar(page: Page): Promise<BarMetrics | null> {
  return page.evaluate((selector) => {
    const bar = document.querySelector<HTMLElement>(selector);

    if (!bar) {
      return null;
    }

    const rect = bar.getBoundingClientRect();
    const style = getComputedStyle(bar);

    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      position: style.position,
      visibility: style.visibility,
      display: style.display,
      innerHeight: window.innerHeight,
      previousTag: bar.previousElementSibling?.tagName ?? null,
    };
  }, BAR_SELECTOR);
}

async function expectBarInFlow(page: Page): Promise<void> {
  await expect(page.locator(BAR_SELECTOR)).toBeVisible();

  const metrics = await readBar(page);

  expect(metrics).not.toBeNull();

  const bar = metrics as BarMetrics;

  expect(bar.position).not.toBe("fixed");
  expect(bar.visibility).toBe("visible");
  expect(bar.display).not.toBe("none");
  expect(bar.height).toBeGreaterThan(0);
  expect(bar.top).toBeGreaterThanOrEqual(0);
  expect(bar.bottom).toBeLessThanOrEqual(bar.innerHeight + 1);
  // The bar must stay a sibling that follows the scroll container.
  expect(bar.previousTag).toBe("MAIN");
}

async function deepScroll(page: Page): Promise<number> {
  return page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>("main");

    if (!scroller) {
      return 0;
    }

    scroller.scrollTop = scroller.scrollHeight;

    return scroller.scrollTop;
  });
}

async function readScrollTop(page: Page): Promise<number> {
  return page.evaluate(
    () => document.querySelector<HTMLElement>("main")?.scrollTop ?? 0,
  );
}

type ImportedDocument = {
  sections: {
    experience: {
      items: Array<Record<string, unknown>>;
    };
  };
};

async function importMultiPageResume(page: Page): Promise<void> {
  const persisted = (await readPersistedDocument(page)) as
    | ImportedDocument
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

async function swipeUpOverCanvas(page: Page): Promise<number> {
  const canvasBox = await page
    .locator("#panel-preview .resume-page")
    .first()
    .boundingBox();

  expect(canvasBox).not.toBeNull();

  const box = canvasBox as NonNullable<typeof canvasBox>;
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const x = Math.round(box.x + box.width / 2);
  const startY = Math.round(
    Math.min(box.y + box.height / 2, viewportHeight - 120),
  );
  const steps = 12;
  const stepPx = 18;
  const client = await page.context().newCDPSession(page);

  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: startY }],
  });

  for (let index = 1; index <= steps; index += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: startY - stepPx * index }],
    });
    await page.waitForTimeout(16);
  }

  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await client.detach();

  await page.waitForTimeout(300);

  return readScrollTop(page);
}

test("the tab bar stays pinned inside the viewport while a panel scrolls", async ({
  page,
}) => {
  await createPresetResume(page);

  expect(await deepScroll(page)).toBeGreaterThan(0);
  await expectBarInFlow(page);
  await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.locator(
      '.mobile-bottom-bar [role="tab"][aria-selected="true"] [data-active-indicator]',
    ),
  ).toHaveCount(1);

  await showTab(page, "Design");

  await expectBarInFlow(page);
  await expect(page.getByRole("tab", { name: "Design" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.locator(
      '.mobile-bottom-bar [role="tab"][aria-selected="true"] [data-active-indicator]',
    ),
  ).toHaveCount(1);
});

test("the mobile shell leaves no dead band under the design panel", async ({
  page,
}) => {
  await createPresetResume(page);
  await showTab(page, "Design");

  const metrics = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>("main");
    const bar = document.querySelector<HTMLElement>(".mobile-bottom-bar");
    const shell = document.querySelector<HTMLElement>("#app-root > div");

    if (!scroller || !bar || !shell) {
      return null;
    }

    return {
      overflow: scroller.scrollHeight - scroller.clientHeight,
      scrollerBottom: scroller.getBoundingClientRect().bottom,
      barTop: bar.getBoundingClientRect().top,
      shellHeight: shell.getBoundingClientRect().height,
      innerHeight: window.innerHeight,
    };
  });

  expect(metrics).not.toBeNull();

  const shell = metrics as NonNullable<typeof metrics>;

  expect(shell.overflow).toBeLessThanOrEqual(8);
  // The scroll container must reach the bar; a gap is the old bottom padding.
  expect(Math.abs(shell.barTop - shell.scrollerBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(shell.shellHeight - shell.innerHeight)).toBeLessThanOrEqual(
    1,
  );
});

test("the preview is reachable without scrolling and clear of the bar", async ({
  page,
}) => {
  await createPresetResume(page);
  await showTab(page, "Preview");
  await expect(page.locator("#panel-preview .resume-pages")).toBeVisible({
    timeout: 20_000,
  });

  const savePdf = page.getByRole("button", { name: "Save PDF" });

  await expect(savePdf).toBeVisible();

  const saveBox = await savePdf.boundingBox();

  expect(saveBox).not.toBeNull();

  const saveButton = saveBox as NonNullable<typeof saveBox>;

  expect(saveButton.y).toBeGreaterThanOrEqual(0);
  expect(saveButton.y + saveButton.height).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerHeight),
  );

  const layout = await page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>(".mobile-bottom-bar");
    const header = document.querySelector<HTMLElement>("header");
    const heading = document.querySelector<HTMLElement>("header h1");

    if (!bar || !header || !heading) {
      return null;
    }

    return {
      barTop: bar.getBoundingClientRect().top,
      headerBottom: header.getBoundingClientRect().bottom,
      headingTop: heading.getBoundingClientRect().top,
      headingBottom: heading.getBoundingClientRect().bottom,
    };
  });

  expect(layout).not.toBeNull();

  const chrome = layout as NonNullable<typeof layout>;

  expect(await readScrollTop(page)).toBe(0);
  expect(chrome.headingTop).toBeGreaterThanOrEqual(0);
  expect(chrome.headingBottom).toBeLessThanOrEqual(chrome.barTop);
  expect(chrome.headerBottom).toBeLessThanOrEqual(chrome.barTop);
});

test("a multi-page preview scrolls with a one-finger swipe", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "needs CDP touch");

  await createPresetResume(page);
  await importMultiPageResume(page);
  await showTab(page, "Preview");
  await expect(page.locator("#panel-preview .resume-pages")).toBeVisible({
    timeout: 20_000,
  });
  await expect
    .poll(
      async () => page.locator("#panel-preview .resume-page").count(),
      { timeout: 20_000 },
    )
    .toBeGreaterThanOrEqual(3);

  const before = await readScrollTop(page);
  const after = await swipeUpOverCanvas(page);

  expect(before).toBe(0);
  expect(after).toBeGreaterThan(100);
});

test("prints a non-empty resume from the Content tab without visiting Preview", async ({
  page,
}) => {
  await stubPrint(page, true);
  await createPresetResume(page);

  // The regression: on a phone the editor lands on Content, so the Preview
  // panel (and anything measured inside it) is display:none. Save PDF must
  // still capture real pages instead of a blank sheet.
  await expect(page.getByRole("tab", { name: "Content" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("button", { name: "Save PDF" }).click();

  await expect
    .poll(async () => (await readPrintCalls(page)).length)
    .toBe(1);

  const [call] = await readPrintCalls(page);

  expect(call.portalExists).toBe(true);
  expect(call.directChild).toBe(true);
  expect(call.pageCount).toBeGreaterThan(0);
  expect(call.sectionCount).toBeGreaterThan(0);
  expect(call.textLength).toBeGreaterThan(0);
  expect(call.title).toMatch(
    /^maya-chen-senior-backend-engineer-\d{4}-\d{2}-\d{2}-resume$/,
  );

  // The tab title returns to the ASCII-safe editor slug after the spool.
  await expect(page).toHaveTitle("Maya_Chen_Resume");
});
