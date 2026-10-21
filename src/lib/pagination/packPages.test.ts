import { describe, expect, it } from "vitest";
import { packPages, type PackBlock } from "./packPages";

const blocks = (...entries: PackBlock[]): PackBlock[] => entries;

describe("packPages", () => {
  it("returns a single empty page for empty input", () => {
    expect(packPages([], 1080)).toEqual({ pages: [[]], overflowPx: 0 });
  });

  it("keeps an exact fit on one page", () => {
    const result = packPages(
      blocks({ id: "a", heightPx: 600 }, { id: "b", heightPx: 480 }),
      1080,
    );

    expect(result.pages).toEqual([["a", "b"]]);
    expect(result.overflowPx).toBe(0);
  });

  it("breaks to a new page when content overflows by 1px", () => {
    const result = packPages(
      blocks({ id: "a", heightPx: 600 }, { id: "b", heightPx: 481 }),
      1080,
    );

    expect(result.pages).toEqual([["a"], ["b"]]);
    expect(result.overflowPx).toBe(0);
  });

  it("handles the sub-pixel boundary", () => {
    const fits = packPages(
      blocks({ id: "a", heightPx: 600.25 }, { id: "b", heightPx: 479.75 }),
      1080,
    );
    const overflows = packPages(
      blocks({ id: "a", heightPx: 600.25 }, { id: "b", heightPx: 479.76 }),
      1080,
    );

    expect(fits.pages).toEqual([["a", "b"]]);
    expect(overflows.pages).toEqual([["a"], ["b"]]);
  });

  it("honors startOnNewPage on a later block", () => {
    const result = packPages(
      blocks({ id: "a", heightPx: 100 }, { id: "b", heightPx: 100, startOnNewPage: true }),
      1080,
    );

    expect(result.pages).toEqual([["a"], ["b"]]);
  });

  it("does not create a leading empty page for startOnNewPage on the first block", () => {
    const result = packPages(blocks({ id: "a", heightPx: 100, startOnNewPage: true }), 1080);

    expect(result.pages).toEqual([["a"]]);
  });

  it("gives an oversized block its own page and reports overflow", () => {
    const result = packPages(blocks({ id: "a", heightPx: 1200 }), 1080);

    expect(result.pages).toEqual([["a"]]);
    expect(result.overflowPx).toBe(120);
  });

  it("preserves order across multiple pages", () => {
    const result = packPages(
      blocks(
        { id: "a", heightPx: 500 },
        { id: "b", heightPx: 500 },
        { id: "c", heightPx: 100 },
        { id: "d", heightPx: 500 },
        { id: "e", heightPx: 500 },
      ),
      1000,
    );

    expect(result.pages).toEqual([["a", "b"], ["c", "d"], ["e"]]);
    expect(result.pages.flat()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("throws a RangeError for a non-positive content height", () => {
    expect(() => packPages([], 0)).toThrow(RangeError);
    expect(() => packPages([], -1)).toThrow(RangeError);
  });

  it("throws a RangeError for a negative block height", () => {
    expect(() => packPages(blocks({ id: "a", heightPx: -1 }), 1080)).toThrow(RangeError);
  });

  it("does not mutate the input array", () => {
    const input = blocks(
      { id: "a", heightPx: 600 },
      { id: "b", heightPx: 600, startOnNewPage: true },
    );
    const before = structuredClone(input);

    packPages(input, 1080);

    expect(input).toEqual(before);
  });
});
