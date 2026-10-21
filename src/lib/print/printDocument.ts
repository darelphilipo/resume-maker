const PRINT_TIMEOUT_MS = 60_000;

export type PrintResumeOptions = {
  pages: string[][];
  name: string;
  beforePrint?: () => void | Promise<void>;
  print?: () => void;
  fontsReady?: () => Promise<unknown>;
};

export function printTitle(name: string): string {
  const base = name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-_]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return base === "" ? "Resume" : `${base}-Resume`;
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

    document.title = printTitle(opts.name);

    const afterPrint = waitForAfterPrint();

    try {
      print();
    } catch {
      window.dispatchEvent(new Event("afterprint"));
    }

    await afterPrint;
  } finally {
    document.title = previousTitle;
  }
}
