import { expect, test, type Page } from "@playwright/test";

import {
  createPresetResume,
  openFirstExperienceEntry,
  readPersistedDocument,
  readPersistedJson,
  showPreview,
  showTab,
  toggleSection,
} from "./helpers";

test.describe.configure({ timeout: 120_000 });

async function experienceSection(page: Page) {
  return page
    .locator("#panel-preview .resume-section")
    .filter({ has: page.getByRole("heading", { name: "Experience" }) })
    .first();
}

async function certificationsMetrics(page: Page) {
  return page.evaluate(() => {
    const pages = Array.from(
      document.querySelectorAll<HTMLElement>(
        "#panel-preview .resume-page",
      ),
    );

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const sections = Array.from(
        pages[pageIndex].querySelectorAll<HTMLElement>(".resume-section"),
      );
      const sectionIndex = sections.findIndex(
        (section) =>
          section
            .querySelector(".resume-section-heading")
            ?.textContent?.trim() === "Certifications",
      );

      if (sectionIndex === -1) {
        continue;
      }

      const nextSection = sections[sectionIndex + 1];
      const nextRect = nextSection?.getBoundingClientRect() ?? null;
      const onyx = pages[pageIndex].querySelector<HTMLElement>(".onyx");

      return {
        pageIndex,
        sectionIndex,
        nextY: nextRect?.y ?? null,
        contentHeight: onyx?.getBoundingClientRect().height ?? 0,
      };
    }

    return null;
  });
}

async function pageContentHeight(page: Page, pageIndex: number) {
  return page.evaluate((index) => {
    const pages = document.querySelectorAll<HTMLElement>(
      "#panel-preview .resume-page",
    );
    const onyx = pages[index]?.querySelector<HTMLElement>(".onyx");

    return onyx?.getBoundingClientRect().height ?? 0;
  }, pageIndex);
}

async function nextSectionY(page: Page, pageIndex: number, index: number) {
  return page.evaluate(
    ({ pageIndex: targetPage, sectionIndex }) => {
      const pages = document.querySelectorAll<HTMLElement>(
        "#panel-preview .resume-page",
      );
      const sections = pages[targetPage]?.querySelectorAll<HTMLElement>(
        ".resume-section",
      );

      return sections?.[sectionIndex]?.getBoundingClientRect().y ?? null;
    },
    { pageIndex, sectionIndex: index },
  );
}

const STARTER_PRESETS = [
  "Software Engineer",
  "Product Manager",
  "UX/UI Designer",
  "Finance & Operations",
  "Data Analyst",
  "Fresh Graduate",
] as const;

test.describe("starter presets", () => {
  for (const label of STARTER_PRESETS) {
    test(`${label} lands on one page out of the box`, async ({ page }) => {
      await createPresetResume(page, new RegExp(label));
      await showPreview(page);

      await expect(page.getByText("1 page", { exact: true })).toBeVisible();
    });
  }
});

test("edits, reorders, undoes, and persists a resume", async ({ page }) => {
  await createPresetResume(page);

  const nameInput = page.getByLabel("Name");

  await expect(nameInput).toHaveValue("Maya Chen");
  await nameInput.fill("Ada Lovelace");
  await expect(
    page.getByRole("banner").getByRole("heading", { level: 1, name: "Ada Lovelace" }),
  ).toBeVisible();

  const editor = await openFirstExperienceEntry(page);

  await editor.focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.type(" and shipped it weekly");
  await expect(page.locator("#panel-content")).toContainText("shipped it weekly");

  await page.getByRole("button", { name: "Move up entry 2" }).click();

  await showPreview(page);
  await expect(
    (await experienceSection(page)).locator(".resume-entry-title").first(),
  ).toHaveText("Backend Engineer");
  await expect(page.getByText("1 page", { exact: true })).toBeVisible();

  await expect
    .poll(async () => readPersistedJson(page))
    .toContain("shipped it weekly");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  const undoButton = page.getByRole("banner").getByRole("button", { name: "Undo" });

  await undoButton.click();
  await undoButton.click();

  await showTab(page, "Content");
  await expect(page.locator("#panel-content")).not.toContainText("shipped it weekly");

  const redoButton = page.getByRole("banner").getByRole("button", { name: "Redo" });

  await redoButton.click();
  await redoButton.click();
  await expect(page.locator("#panel-content")).toContainText("shipped it weekly");

  await expect
    .poll(async () => readPersistedJson(page))
    .toContain("shipped it weekly");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Save PDF" })).toBeVisible();
  await expect(
    page.getByRole("banner").getByRole("heading", { level: 1, name: "Ada Lovelace" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace");

  await showPreview(page);
  await expect(page.locator("#panel-preview .resume-page").first()).toContainText(
    "shipped it weekly",
  );
  await expect(
    (await experienceSection(page)).locator(".resume-entry-title").first(),
  ).toHaveText("Backend Engineer");
});

test("hiding the profile picture removes the avatar column", async ({
  page,
}) => {
  await createPresetResume(page);

  const pictureUrl = page.getByLabel("Picture URL");
  const hidePicture = page.getByLabel("Hide picture");

  await expect(hidePicture).toBeChecked();
  // The URL field is only shown while the picture is visible.
  await expect(pictureUrl).toHaveCount(0);
  await hidePicture.uncheck();
  await pictureUrl.fill("https://example.com/avatar.png");

  await showPreview(page);

  const previewPage = page.locator("#panel-preview .resume-page").first();

  await expect(previewPage.locator("img")).toHaveCount(1);
  await expect(page.locator("#print-portal img")).toHaveCount(0);

  await showTab(page, "Content");
  await hidePicture.check();
  await showPreview(page);

  await expect(page.locator("#panel-preview .resume-page img")).toHaveCount(0);
  await expect(page.locator("#print-portal img")).toHaveCount(0);

  const metrics = await page.evaluate(() => {
    const pageElement = document.querySelector<HTMLElement>(
      "#panel-preview .resume-page",
    );
    const nameElement =
      pageElement?.querySelector<HTMLElement>(".resume-name");

    if (!pageElement || !nameElement) {
      return null;
    }

    const pageStyle = getComputedStyle(pageElement);
    const pageRect = pageElement.getBoundingClientRect();
    const nameRect = nameElement.getBoundingClientRect();
    const scale = pageRect.width / Number.parseFloat(pageStyle.width);
    const contentLeft =
      pageRect.x + Number.parseFloat(pageStyle.paddingLeft) * scale;

    return { nameX: nameRect.x, contentLeft };
  });

  expect(metrics).not.toBeNull();

  const result = metrics as NonNullable<typeof metrics>;

  expect(Math.abs(result.nameX - result.contentLeft)).toBeLessThanOrEqual(2);
});

test("hiding a section closes the gap it leaves behind", async ({ page }) => {
  await createPresetResume(page);
  await showPreview(page);

  const before = await certificationsMetrics(page);

  expect(before).not.toBeNull();

  const start = before as NonNullable<typeof before>;

  await toggleSection(page, "certifications", "Certifications", "Hide");
  await expect(
    page.getByRole("button", { name: "Show Certifications", exact: true }),
  ).toBeVisible();

  await showPreview(page);
  await expect(
    page
      .locator("#panel-preview .resume-section-heading")
      .filter({ hasText: "Certifications" }),
  ).toHaveCount(0);

  if (start.nextY !== null) {
    await expect
      .poll(async () =>
        nextSectionY(page, start.pageIndex, start.sectionIndex),
      )
      .toBeLessThan(start.nextY);
  } else {
    await expect
      .poll(async () => pageContentHeight(page, start.pageIndex))
      .toBeLessThan(start.contentHeight);
  }
});

test("sanitizes a hostile JSON import", async ({ page }) => {
  await createPresetResume(page);

  const persisted = await readPersistedDocument(page);

  expect(typeof persisted).toBe("object");

  const hostile = JSON.parse(JSON.stringify(persisted)) as {
    sections: {
      experience: {
        items: Array<{ summary: string }>;
      };
    };
  };

  hostile.sections.experience.items[0].summary =
    '<p>ok</p><script>window.__pwned = true</script><img src=x onerror="window.__pwned = true">';

  await page.goto("/");
  await page.locator("#resume-json-input").setInputFiles({
    name: "hostile.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(hostile)),
  });

  await page.waitForURL(/\/editor\/?\?id=/);
  await expect(page.getByRole("button", { name: "Save PDF" })).toBeVisible();
  await showPreview(page);

  await expect(
    page.locator("#panel-preview .resume-page").first(),
  ).toContainText("ok");

  await expect(page.locator("#print-portal script")).toHaveCount(0);
  await expect(page.locator("#panel-preview .resume-page script")).toHaveCount(
    0,
  );
  await expect(
    page.locator("#panel-preview .resume-page img[onerror]"),
  ).toHaveCount(0);
  await expect(page.locator("#panel-preview .resume-page img")).toHaveCount(0);

  expect(
    await page.evaluate(
      () => (window as unknown as { __pwned?: boolean }).__pwned,
    ),
  ).toBeUndefined();
});

test("rejects invalid JSON without touching the loaded resume", async ({
  page,
}) => {
  await createPresetResume(page);

  const editorUrl = page.url();

  await page.goto("/");
  await page.locator("#resume-json-input").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ this is not json"),
  });

  await expect(page.locator('p[role="alert"]')).toContainText(
    "not a valid resume backup",
  );
  await expect(page).toHaveURL(/\/$/);

  await page.goto(editorUrl);
  await expect(page.getByRole("button", { name: "Save PDF" })).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveValue("Maya Chen");
  await expect(
    page.getByRole("banner").getByRole("heading", { level: 1, name: "Maya Chen" }),
  ).toBeVisible();
});
