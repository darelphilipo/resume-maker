export type PackBlock = {
  id: string;
  heightPx: number;
  startOnNewPage?: boolean;
  /**
   * Per-bullet fragments of a split entry, in reading order. Used only when the
   * whole block cannot fit: a tall entry then fills the remaining page at a
   * bullet boundary instead of being pushed whole to the next page (which left
   * Page 1 blank and clipped the entry in print).
   */
  fragments?: readonly PackBlock[];
};

export type PackedPages = { pages: string[][]; overflowPx: number };

export type PackPagesOptions = {
  /**
   * Heights for the same block ids once Page 1 is full. The Studio Sidebar
   * renders Page 1's main blocks in a narrow column, then collapses its grid to
   * one full-width column on Page 2+, so the narrow-column height over-reports
   * every later page. Without this, a section that only fits at the full width
   * can be stranded on an otherwise empty extra page.
   */
  fullWidthHeights?: Readonly<Record<string, number>>;
};

/**
 * A block must be at least this share of a page before it is worth splitting.
 * A short entry that misses the remaining space is cleaner moved whole; only a
 * genuinely tall entry should straddle a page boundary.
 */
export const FRAGMENT_SPLIT_MIN_PAGE_RATIO = 0.35;

/**
 * Below `FRAGMENT_SPLIT_MIN_PAGE_RATIO`, an entry is still split when moving it
 * whole would waste at least this share of the current page and at least
 * `FRAGMENT_SPLIT_MIN_FITTING_FRAGMENTS` fragments fit in the gap. The Studio
 * Sidebar's narrow Page 1 main column makes entries taller there, so a mid-size
 * entry can miss the remaining space yet fall under the 35% bar; moving it whole
 * then leaves a quarter-page hole beside a full sidebar.
 */
export const FRAGMENT_SPLIT_WASTED_PAGE_RATIO = 0.25;

export const FRAGMENT_SPLIT_MIN_FITTING_FRAGMENTS = 2;

function countFittingFragments(
  fragments: readonly PackBlock[],
  availableHeightPx: number,
  heightOf: (block: PackBlock) => number,
): number {
  let usedHeightPx = 0;
  let count = 0;

  for (const fragment of fragments) {
    const heightPx = heightOf(fragment);

    if (usedHeightPx + heightPx > availableHeightPx) {
      break;
    }

    usedHeightPx += heightPx;
    count += 1;
  }

  return count;
}

function isSplittable(
  block: PackBlock,
  contentHeightPx: number,
  heightPx: number,
  availableHeightPx: number,
  heightOf: (block: PackBlock) => number,
): block is PackBlock & { fragments: readonly PackBlock[] } {
  if (!Array.isArray(block.fragments) || block.fragments.length === 0) {
    return false;
  }

  if (
    heightPx > contentHeightPx ||
    heightPx >= contentHeightPx * FRAGMENT_SPLIT_MIN_PAGE_RATIO
  ) {
    return true;
  }

  if (availableHeightPx < contentHeightPx * FRAGMENT_SPLIT_WASTED_PAGE_RATIO) {
    return false;
  }

  return (
    countFittingFragments(block.fragments, availableHeightPx, heightOf) >=
    FRAGMENT_SPLIT_MIN_FITTING_FRAGMENTS
  );
}

function isUsableHeight(heightPx: unknown): heightPx is number {
  return (
    typeof heightPx === "number" && Number.isFinite(heightPx) && heightPx >= 0
  );
}

export function packPages(
  blocks: ReadonlyArray<PackBlock>,
  contentHeightPx: number,
  gapPx: number = 0,
  options: PackPagesOptions = {},
): PackedPages {
  if (contentHeightPx <= 0) {
    throw new RangeError("Content height must be positive.");
  }

  if (gapPx < 0) {
    throw new RangeError("Page gap must be non-negative.");
  }

  for (const block of blocks) {
    if (block.heightPx < 0) {
      throw new RangeError(`Block "${block.id}" has a negative height.`);
    }
  }

  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentHeight = 0;
  let overflowPx = 0;
  const fullWidthHeights = options.fullWidthHeights;

  // Page 1 keeps the measured heights (the Studio Sidebar's narrow two-column
  // grid). Every page after it uses the full-width height when one was
  // measured; an unknown or malformed override falls back to the real height.
  const heightOnCurrentPage = (block: PackBlock): number => {
    if (pages.length === 0 || !fullWidthHeights) {
      return block.heightPx;
    }

    const fullWidthHeightPx = fullWidthHeights[block.id];

    return isUsableHeight(fullWidthHeightPx)
      ? fullWidthHeightPx
      : block.heightPx;
  };

  const flush = (): void => {
    if (currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
  };

  for (const block of blocks) {
    if (block.startOnNewPage && currentPage.length > 0) {
      flush();
    }

    const gap = currentPage.length > 0 ? gapPx : 0;
    const blockHeightPx = heightOnCurrentPage(block);

    if (currentHeight + gap + blockHeightPx <= contentHeightPx) {
      currentPage.push(block.id);
      currentHeight += gap + blockHeightPx;
      continue;
    }

    const availableHeightPx = contentHeightPx - currentHeight - gap;

    if (
      isSplittable(
        block,
        contentHeightPx,
        blockHeightPx,
        availableHeightPx,
        heightOnCurrentPage,
      )
    ) {
      let firstFragment = true;

      for (const fragment of block.fragments) {
        // Fragments of one entry are continuous: only the first pays the page
        // gap before the entry, the rest follow on directly.
        const fragmentGap = firstFragment ? gap : 0;
        const fragmentHeightPx = heightOnCurrentPage(fragment);

        if (
          currentHeight + fragmentGap + fragmentHeightPx <=
          contentHeightPx
        ) {
          currentPage.push(fragment.id);
          currentHeight += fragmentGap + fragmentHeightPx;
        } else {
          flush();

          // A fragment that continues on Page 2+ renders at the full width.
          const nextHeightPx = heightOnCurrentPage(fragment);

          if (nextHeightPx > contentHeightPx) {
            overflowPx += nextHeightPx - contentHeightPx;
          }

          currentPage.push(fragment.id);
          currentHeight = nextHeightPx;
        }

        firstFragment = false;
      }

      continue;
    }

    flush();

    const nextHeightPx = heightOnCurrentPage(block);

    if (nextHeightPx > contentHeightPx) {
      overflowPx += nextHeightPx - contentHeightPx;
    }

    currentPage.push(block.id);
    currentHeight = nextHeightPx;
  }

  flush();

  if (pages.length === 0) {
    pages.push([]);
  }

  return { pages, overflowPx };
}
