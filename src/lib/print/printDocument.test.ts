import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { printResume, printTitle } from "./printDocument";

const originalTitle = document.title;

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
});

describe("printTitle", () => {
  it("slugifies a name and appends the resume suffix", () => {
    expect(printTitle("Ada Lovelace")).toBe("Ada-Lovelace-Resume");
  });

  it("trims and collapses whitespace", () => {
    expect(printTitle("   Ada   Lovelace   ")).toBe("Ada-Lovelace-Resume");
  });

  it("strips emoji and punctuation", () => {
    expect(printTitle("Ada 😀 Lovelace!")).toBe("Ada-Lovelace-Resume");
    expect(printTitle("Dr. Ada-Lovelace_PhD")).toBe(
      "Dr-Ada-Lovelace_PhD-Resume",
    );
  });

  it("falls back to Resume for empty or unusable names", () => {
    expect(printTitle("")).toBe("Resume");
    expect(printTitle("   ")).toBe("Resume");
    expect(printTitle("😀 !!!")).toBe("Resume");
  });
});

describe("printResume", () => {
  it("sets the title, calls print, and restores the title after afterprint", async () => {
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
      beforePrint,
      print,
      fontsReady: () => Promise.resolve(),
    });

    expect(beforePrint).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
    expect(titlesAtPrint).toEqual(["Ada-Lovelace-Resume"]);
    expect(document.title).toBe("Original title");
  });

  it("resolves through the safety timeout when afterprint never fires", async () => {
    vi.useFakeTimers();
    const print = vi.fn();

    const promise = printResume({
      pages: [["__header"]],
      name: "Ada Lovelace",
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
        print,
        fontsReady: () => Promise.resolve(),
      }),
    ).resolves.toBeUndefined();

    expect(document.title).toBe("Original title");
  });
});
