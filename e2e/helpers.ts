import { expect, type Locator, type Page } from "@playwright/test";

export type EditorTabName = "Content" | "Design" | "Preview";

export type PrintCall = {
  title: string;
  portalExists: boolean;
  directChild: boolean;
  pageCount: number;
};

type PrintWindow = Window & { __printCalls: PrintCall[] };

export async function createPresetResume(
  page: Page,
  label: RegExp = /Software Engineer/,
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: label }).click();
  await page.waitForURL(/\/editor\/?\?id=/);
  await expect(page.getByRole("button", { name: "Save PDF" })).toBeVisible();
  await expandBasics(page);
  await expect(page.getByLabel("Name")).not.toHaveValue("");
}

/**
 * Basics starts collapsed so the section list is visible on first load. Any
 * test that edits a Basics field has to open the card first.
 */
export async function expandBasics(page: Page): Promise<void> {
  const toggle = page.getByRole("button", { name: /^Basics/ });

  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }

  await expect(page.getByLabel("Name")).toBeVisible();
}

export async function showTab(
  page: Page,
  tab: EditorTabName,
): Promise<void> {
  const tabButton = page.getByRole("tab", { name: tab, exact: true });

  if (await tabButton.isVisible()) {
    await tabButton.click();
  }

  await expect(
    page.getByRole("tabpanel", { name: tab, exact: true }),
  ).toBeVisible();
}

export async function showPreview(page: Page): Promise<void> {
  await showTab(page, "Preview");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("#panel-preview .resume-pages")).toBeVisible({
    timeout: 20_000,
  });
}

export async function openFirstExperienceEntry(
  page: Page,
): Promise<Locator> {
  await showTab(page, "Content");

  const row = page.locator('button[aria-controls="section-body-experience"]');

  if ((await row.getAttribute("aria-expanded")) !== "true") {
    await row.click();
  }

  const editor = page.getByRole("textbox", {
    name: "Description for entry 1",
    exact: true,
  });

  await expect(editor).toBeVisible();

  return editor;
}

export async function toggleSection(
  page: Page,
  sectionId: string,
  title: string,
  action: "Hide" | "Show",
): Promise<void> {
  await showTab(page, "Content");

  const row = page.locator(
    `button[aria-controls="section-body-${sectionId}"]`,
  );

  if ((await row.getAttribute("aria-expanded")) !== "true") {
    await row.click();
  }

  await page
    .getByRole("button", { name: `${action} ${title}`, exact: true })
    .click();
}

export async function readPersistedDocument(page: Page): Promise<unknown> {
  const id = new URL(page.url()).searchParams.get("id");

  if (!id) {
    return null;
  }

  return page.evaluate(async (resumeId) => {
    return new Promise<unknown>((resolve, reject) => {
      const request = indexedDB.open("resume-maker");

      request.onerror = () => {
        reject(request.error ?? new Error("Could not open IndexedDB."));
      };

      request.onsuccess = () => {
        const db = request.result;

        try {
          const transaction = db.transaction("resumes", "readonly");
          const store = transaction.objectStore("resumes");
          const read = store.get(resumeId);

          read.onsuccess = () => {
            const row = read.result as { doc?: unknown } | undefined;

            db.close();
            resolve(row?.doc ?? null);
          };
          read.onerror = () => {
            db.close();
            reject(read.error ?? new Error("Could not read the resume."));
          };
        } catch (error) {
          db.close();
          reject(error);
        }
      };
    });
  }, id);
}

export async function readPersistedJson(page: Page): Promise<string> {
  const doc = await readPersistedDocument(page);

  return JSON.stringify(doc);
}

export async function stubPrint(
  page: Page,
  dispatchAfterPrint: boolean,
): Promise<void> {
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

export async function readPrintCalls(page: Page): Promise<PrintCall[]> {
  return page.evaluate(
    () => (window as unknown as PrintWindow).__printCalls,
  );
}
