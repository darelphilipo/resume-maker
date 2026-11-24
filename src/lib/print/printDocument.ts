import type { PaperFormat } from "@/lib/units/pageGeometry";

const PRINT_TIMEOUT_MS = 60_000;
const TOUCH_TITLE_RESTORE_DELAY_MS = 1_200;

/**
 * The `@page` rule that matches the selected paper format. `print.css` keeps an
 * A4 rule as a static fallback, but a saved Letter document must tell the print
 * dialog `letter` or Chrome silently prints on A4 and clips the shorter page.
 * Unknown/legacy values fall back to A4 (the schema default).
 */
export function printPageSizeCss(format: PaperFormat): string {
  return format === "letter"
    ? "@page { size: letter portrait; margin: 0mm; }"
    : "@page { size: A4 portrait; margin: 0mm; }";
}

/** Short paper-size name for the print-dialog reminder on touch devices. */
export function printPageSizeLabel(format: PaperFormat): string {
  return format === "letter" ? "Letter" : "A4";
}

export type PrintResumeOptions = {
  pages: string[][];
  name: string;
  headline?: string;
  date?: Date;
  beforePrint?: () => void | Promise<void>;
  print?: () => void;
  fontsReady?: () => Promise<unknown>;
};

export type PrintTitleInput = {
  name: string;
  headline?: string;
  date?: Date;
};

export function slugSegment(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function printDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function printTitle(input: PrintTitleInput): string {
  const segments = [
    slugSegment(input.name),
    slugSegment(input.headline ?? ""),
    printDateStamp(input.date ?? new Date()),
  ].filter(Boolean);

  const base = segments.join("-");

  return base === "" ? "resume" : `${base}-resume`;
}

/**
 * Human-readable browser-tab title for the open editor. It stays in place for
 * the whole editing session so browsers (notably Android Chrome's async print
 * spooler) can read the resume name for the PDF "Save as" filename instead of
 * a title that was restored too early.
 */
export function resumeDocumentTitle(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");

  return clean === "" ? "Resume Maker" : `${clean} - Resume`;
}

function isCoarsePointer(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(pointer: coarse)").matches;
}

function waitForTitleRestoreDelay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, TOUCH_TITLE_RESTORE_DELAY_MS);
  });
}

function defaultFontsReady(): Promise<unknown> {
  if (typeof document !== "undefined" && document.fonts) {
    return document.fonts.ready;
  }

  return Promise.resolve();
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
      return;
    }

    setTimeout(resolve, 0);
  });
}

async function waitForImages(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>("#print-portal img"),
  );

  await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
}

function waitForAfterPrint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      window.removeEventListener("afterprint", finish);
      window.clearTimeout(timeout);
      resolve();
    };

    const timeout = window.setTimeout(finish, PRINT_TIMEOUT_MS);

    window.addEventListener("afterprint", finish);
  });
}

export async function printResume(opts: PrintResumeOptions): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const fontsReady = opts.fontsReady ?? defaultFontsReady;
  const print = opts.print ?? (() => window.print());
  const previousTitle = document.title;

  try {
    try {
      await fontsReady();
    } catch {
      // Font loading failures should never block printing.
    }

    await waitForImages();
    await nextFrame();
    await nextFrame();

    try {
      await opts.beforePrint?.();
    } catch {
      // A failing pre-print hook should never block the print dialog.
    }

    document.title = printTitle({
      name: opts.name,
      headline: opts.headline,
      date: opts.date ?? new Date(),
    });

    const afterPrint = waitForAfterPrint();

    try {
      print();
    } catch {
      window.dispatchEvent(new Event("afterprint"));
    }

    await afterPrint;
  } finally {
    if (isCoarsePointer()) {
      await waitForTitleRestoreDelay();
    }

    document.title = previousTitle;
  }
}
