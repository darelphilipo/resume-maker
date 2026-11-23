import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  printDateStamp,
  printResume,
  printTitle,
  resumeDocumentTitle,
  slugSegment,
} from "./printDocument";

const originalTitle = document.title;
const originalMatchMedia = window.matchMedia;

const TOUCH_TITLE_RESTORE_DELAY_MS = 1_200;

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  document.title = "Original title";
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.title = originalTitle;
  window.matchMedia = originalMatchMedia;
});

const FAKE_TIMER_APIS: Array<"setTimeout" | "clearTimeout"> = [
  "setTimeout",
  "clearTimeout",
];

function stubMatchMedia(matches: boolean): void {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

function removeMatchMedia(): void {
  window.matchMedia = undefined as unknown as typeof window.matchMedia;
}

async function flushMicrotasks(): Promise<void> {
  for (let tick = 0; tick < 20; tick += 1) {
    await Promise.resolve();
  }
}

describe("slugSegment", () => {
  it("lowercases and kebab-cases words", () => {
    expect(slugSegment("Jordan Alvarez")).toBe("jordan-alvarez");
    expect(slugSegment("  Zoë   O'Brien-Déclat ")).toBe("zoe-o-brien-declat");
    expect(slugSegment("R&D Lead")).toBe("r-d-lead");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugSegment("   ")).toBe("");
    expect(slugSegment("😀 !!!")).toBe("");
  });
});

describe("printDateStamp", () => {
  it("formats the local calendar date", () => {
    expect(printDateStamp(new Date(2026, 10, 15))).toBe("2026-11-15");
    expect(printDateStamp(new Date(2026, 0, 2))).toBe("2026-01-02");
  });

  it("does not shift dates that are near local midnight", () => {
    expect(printDateStamp(new Date(2026, 10, 15, 23, 30))).toBe("2026-11-15");
    expect(printDateStamp(new Date(2026, 10, 15, 0, 5))).toBe("2026-11-15");
  });
});

describe("printTitle", () => {
  it("slugifies name, headline, and date and appends the resume suffix", () => {
    expect(
      printTitle({
        name: "Jordan Alvarez",
        headline: "Product Manager",
        date: new Date(2026, 10, 15),
      }),
    ).toBe("jordan-alvarez-product-manager-2026-11-15-resume");
  });

  it("omits a missing headline", () => {
    expect(
      printTitle({ name: "Ada Lovelace", date: new Date(2026, 0, 2) }),
    ).toBe("ada-lovelace-2026-01-02-resume");

    expect(
      printTitle({
        name: "Ada Lovelace",
        headline: "   ",
        date: new Date(2026, 0, 2),
      }),
    ).toBe("ada-lovelace-2026-01-02-resume");
  });

  it("strips diacritics, apostrophes, and ampersands", () => {
    expect(
      printTitle({
        name: "  Zoë   O'Brien-Déclat ",
        headline: "R&D Lead",
        date: new Date(2026, 10, 15),
      }),
    ).toBe("zoe-o-brien-declat-r-d-lead-2026-11-15-resume");
  });

  it("keeps the date when the name is empty", () => {
    expect(printTitle({ name: "", date: new Date(2026, 10, 15) })).toBe(
      "2026-11-15-resume",
    );
  });

  it("is idempotent for a fixed date", () => {
    const input = {
      name: "Jordan Alvarez",
      headline: "Product Manager",
      date: new Date(2026, 10, 15),
    };

    expect(printTitle(input)).toBe(printTitle(input));
  });

  it("uses the local date so a late-evening print keeps today's date", () => {
    expect(
      printTitle({
        name: "Ada Lovelace",
        date: new Date(2026, 10, 15, 23, 30),
      }),
    ).toBe("ada-lovelace-2026-11-15-resume");
  });
});

describe("resumeDocumentTitle", () => {
  it("keeps the readable resume name for the browser tab and PDF", () => {
    expect(resumeDocumentTitle("Daniel Okafor")).toBe("Daniel Okafor - Resume");
    expect(resumeDocumentTitle("Alex Taylor")).toBe("Alex Taylor - Resume");
  });

  it("collapses stray whitespace without slugifying the name", () => {
    expect(resumeDocumentTitle("  Zoë   O'Brien  ")).toBe(
      "Zoë O'Brien - Resume",
    );
  });

  it("falls back to the app name when no resume name is set", () => {
    expect(resumeDocumentTitle("")).toBe("Resume Maker");
    expect(resumeDocumentTitle("   ")).toBe("Resume Maker");
  });
});

describe("printResume", () => {
  it("sets the title, calls print, and restores the title after afterprint", async () => {
    stubMatchMedia(false);

    const titlesAtPrint: string[] = [];
    const print = vi.fn(() => {
      titlesAtPrint.push(document.title);
      window.dispatchEvent(new Event("afterprint"));
    });
    const beforePrint = vi.fn(() => {
      expect(document.title).toBe("Original title");
    });

    await printResume({
      pages: [["__header", "summary"]],
      name: "Ada Lovelace",
      headline: "Mathematician",
      date: new Date(2026, 0, 2),
      beforePrint,
      print,
      fontsReady: () => Promise.resolve(),
    });

    expect(beforePrint).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
    expect(titlesAtPrint).toEqual([
      "ada-lovelace-mathematician-2026-01-02-resume",
    ]);
    expect(document.title).toBe("Original title");
  });

  it("keeps the filename title after afterprint on a coarse pointer", async () => {
    vi.useFakeTimers({ toFake: FAKE_TIMER_APIS });
    stubMatchMedia(true);

    const print = vi.fn(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    const promise = printResume({
      pages: [["__header"]],
      name: "Ada Lovelace",
      headline: "Mathematician",
      date: new Date(2026, 0, 2),
      print,
      fontsReady: () => Promise.resolve(),
    });

    await flushMicrotasks();

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("ada-lovelace-mathematician-2026-01-02-resume");

    await vi.advanceTimersByTimeAsync(TOUCH_TITLE_RESTORE_DELAY_MS - 1);
    expect(document.title).toBe("ada-lovelace-mathematician-2026-01-02-resume");

    await vi.advanceTimersByTimeAsync(1);
    await promise;

    expect(document.title).toBe("Original title");
  });

  it("restores the title immediately when matchMedia reports a fine pointer", async () => {
    vi.useFakeTimers({ toFake: FAKE_TIMER_APIS });
    stubMatchMedia(false);

    const print = vi.fn(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    const promise = printResume({
      pages: [["__header"]],
      name: "Ada Lovelace",
      date: new Date(2026, 0, 2),
      print,
      fontsReady: () => Promise.resolve(),
    });

    await flushMicrotasks();
    await promise;

    expect(document.title).toBe("Original title");
  });

  it("restores the title immediately when matchMedia is absent", async () => {
    vi.useFakeTimers({ toFake: FAKE_TIMER_APIS });
    removeMatchMedia();

    const print = vi.fn(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    const promise = printResume({
      pages: [["__header"]],
      name: "Ada Lovelace",
      date: new Date(2026, 0, 2),
      print,
      fontsReady: () => Promise.resolve(),
    });

    await flushMicrotasks();
    await promise;

    expect(document.title).toBe("Original title");
  });

  it("resolves through the safety timeout when afterprint never fires", async () => {
    vi.useFakeTimers({ toFake: FAKE_TIMER_APIS });

    const print = vi.fn();

    const promise = printResume({
      pages: [["__header"]],
      name: "Ada Lovelace",
      date: new Date(2026, 0, 2),
      print,
      fontsReady: () => Promise.resolve(),
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(print).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("Original title");
  });

  it("does not throw when the print call fails", async () => {
    const print = vi.fn(() => {
      throw new Error("blocked");
    });

    await expect(
      printResume({
        pages: [["__header"]],
        name: "Ada Lovelace",
        date: new Date(2026, 0, 2),
        print,
        fontsReady: () => Promise.resolve(),
      }),
    ).resolves.toBeUndefined();

    expect(document.title).toBe("Original title");
  });
});
