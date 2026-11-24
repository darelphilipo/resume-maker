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

  it("breaks when the gap is what pushes the content over the limit", () => {
    const result = packPages(
      blocks({ id: "a", heightPx: 481 }, { id: "b", heightPx: 481 }),
      1000,
      40,
    );

    expect(result.pages).toEqual([["a"], ["b"]]);
    expect(result.overflowPx).toBe(0);
  });

  it("keeps two 480px blocks with a 40px gap together when they fit exactly", () => {
    const result = packPages(
      blocks({ id: "a", heightPx: 480 }, { id: "b", heightPx: 480 }),
      1000,
      40,
    );

    expect(result.pages).toEqual([["a", "b"]]);
  });

  it("keeps a gap-inclusive exact fit on one page", () => {
    const result = packPages(
      blocks({ id: "a", heightPx: 500 }, { id: "b", heightPx: 460 }),
      1000,
      40,
    );

    expect(result.pages).toEqual([["a", "b"]]);
    expect(result.overflowPx).toBe(0);
  });

  it("does not charge a gap before the first block on a page", () => {
    const result = packPages(
      blocks(
        { id: "a", heightPx: 1000 },
        { id: "b", heightPx: 1000, startOnNewPage: true },
      ),
      1000,
      40,
    );

    expect(result.pages).toEqual([["a"], ["b"]]);
    expect(result.overflowPx).toBe(0);
  });

  it("throws a RangeError for a negative gap", () => {
    expect(() => packPages([], 1000, -1)).toThrow(RangeError);
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

describe("packPages with bullet fragments", () => {
  it("fills the remaining page at a bullet boundary", () => {
    const result = packPages(
      blocks(
        { id: "a", heightPx: 300 },
        {
          id: "entry",
          heightPx: 900,
          fragments: [
            { id: "f0", heightPx: 250 },
            { id: "f1", heightPx: 250 },
            { id: "f2", heightPx: 250 },
            { id: "f3", heightPx: 250 },
          ],
        },
      ),
      1000,
    );

    expect(result.pages).toEqual([
      ["a", "f0", "f1"],
      ["f2", "f3"],
    ]);
    expect(result.overflowPx).toBe(0);
  });

  it("does not charge the page gap between fragments of one entry", () => {
    const result = packPages(
      blocks(
        { id: "a", heightPx: 400 },
        {
          id: "entry",
          heightPx: 900,
          fragments: [
            { id: "f0", heightPx: 200 },
            { id: "f1", heightPx: 200 },
            { id: "f2", heightPx: 200 },
            { id: "f3", heightPx: 200 },
          ],
        },
      ),
      1000,
      40,
    );

    // Only the first fragment is charged the 40px gap after `a`; the next
    // fragment continues the same entry and follows directly.
    expect(result.pages).toEqual([
      ["a", "f0", "f1"],
      ["f2", "f3"],
    ]);
  });

  it("splits an entry taller than a page", () => {
    const result = packPages(
      blocks({
        id: "entry",
        heightPx: 1200,
        fragments: [
          { id: "f0", heightPx: 300 },
          { id: "f1", heightPx: 300 },
          { id: "f2", heightPx: 300 },
          { id: "f3", heightPx: 300 },
        ],
      }),
      1000,
    );

    expect(result.pages).toEqual([["f0", "f1", "f2"], ["f3"]]);
    expect(result.overflowPx).toBe(0);
  });

  it("moves a short entry whole instead of splitting it for a few lines", () => {
    const result = packPages(
      blocks(
        { id: "a", heightPx: 850 },
        {
          id: "entry",
          heightPx: 200,
          fragments: [
            { id: "f0", heightPx: 70 },
            { id: "f1", heightPx: 65 },
            { id: "f2", heightPx: 65 },
          ],
        },
      ),
      1000,
    );

    expect(result.pages).toEqual([["a"], ["entry"]]);
  });

  it("keeps a whole entry on one page when it fits", () => {
    const result = packPages(
      blocks(
        { id: "a", heightPx: 100 },
        {
          id: "entry",
          heightPx: 400,
          fragments: [
            { id: "f0", heightPx: 150 },
            { id: "f1", heightPx: 250 },
          ],
        },
      ),
      1000,
    );

    expect(result.pages).toEqual([["a", "entry"]]);
  });
});

describe("packPages with full-width heights after Page 1", () => {
  it("keeps Page 1's narrow heights even when a wider copy is measured", () => {
    const result = packPages(
      blocks({ id: "a", heightPx: 900 }, { id: "b", heightPx: 200 }),
      1000,
      0,
      { fullWidthHeights: { a: 300 } },
    );

    // Page 1 renders `a` in the narrow column, so the 900px height must not be
    // replaced by its 300px full-width height.
    expect(result.pages).toEqual([["a"], ["b"]]);
  });

  it("packs Page 2+ at the full-width height so a trailing block still fits", () => {
    const result = packPages(
      blocks(
        { id: "experience", heightPx: 900 },
        { id: "education", heightPx: 500 },
        { id: "awards", heightPx: 600 },
      ),
      1000,
      0,
      { fullWidthHeights: { education: 450, awards: 450 } },
    );

    // At the narrow column width 500 + 600 would spill Awards to Page 3; at the
    // full width the two blocks share Page 2 with room to spare.
    expect(result.pages).toEqual([
      ["experience"],
      ["education", "awards"],
    ]);
    expect(result.overflowPx).toBe(0);
  });

  it("falls back to the real height for a missing or malformed override", () => {
    const result = packPages(
      blocks(
        { id: "a", heightPx: 950 },
        { id: "b", heightPx: 600 },
        { id: "c", heightPx: 600 },
      ),
      1000,
      0,
      { fullWidthHeights: { b: -10 } },
    );

    // `b` keeps its real 600px height, so `c` still starts Page 3.
    expect(result.pages).toEqual([["a"], ["b"], ["c"]]);
  });
});
