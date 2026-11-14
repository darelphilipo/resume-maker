import { expect, test, type Page } from "@playwright/test";

import { createPresetResume, showPreview } from "./helpers";

test.use({ viewport: { width: 1440, height: 900 } });

test.skip(({ isMobile }) => isMobile, "Wheel zoom needs a desktop pointer.");

test.describe.configure({ timeout: 120_000 });

const MAX_SCALE = 2;

async function readScale(page: Page): Promise<number> {
  const transform = await page
    .locator("#panel-preview .react-transform-component")
    .evaluate((element) => element.style.transform);
  const match = /scale\(([\d.]+)\)/.exec(transform);

  if (!match) {
    throw new Error(`No scale found in transform: ${transform}`);
  }

  return Number.parseFloat(match[1]);
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
}

test("one wheel notch is a small multiplicative zoom step", async ({
  page,
}) => {
  await createPresetResume(page);
  await showPreview(page);

  const wrapper = page.locator("#panel-preview .react-transform-wrapper");

  await expect(wrapper).toBeVisible();

  const box = await wrapper.boundingBox();

  expect(box).not.toBeNull();

  const rect = box as NonNullable<typeof box>;

  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await settle(page);

  const initial = await readScale(page);

  expect(initial).toBeGreaterThan(0);

  await page.mouse.wheel(0, -100);
  await settle(page);

  const afterOneNotch = await readScale(page);

  expect(afterOneNotch / initial).toBeGreaterThanOrEqual(1.05);
  expect(afterOneNotch / initial).toBeLessThanOrEqual(1.15);
  expect(afterOneNotch).toBeLessThan(MAX_SCALE);

  await page.mouse.wheel(0, -100);
  await settle(page);

  const afterTwoNotches = await readScale(page);

  expect(afterTwoNotches).toBeGreaterThan(afterOneNotch);

  await page.mouse.wheel(0, 100);
  await settle(page);

  const afterNotchDown = await readScale(page);

  expect(afterNotchDown).toBeLessThan(afterTwoNotches);
});
