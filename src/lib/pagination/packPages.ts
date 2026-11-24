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

/**
 * A block must be at least this share of a page before it is worth splitting.
 * A short entry that misses the remaining space is cleaner moved whole; only a
 * genuinely tall entry should straddle a page boundary.
 */
export const FRAGMENT_SPLIT_MIN_PAGE_RATIO = 0.35;

function isSplittable(
  block: PackBlock,
  contentHeightPx: number,
): block is PackBlock & { fragments: readonly PackBlock[] } {
  return (
    Array.isArray(block.fragments) &&
    block.fragments.length > 0 &&
    (block.heightPx > contentHeightPx ||
      block.heightPx >= contentHeightPx * FRAGMENT_SPLIT_MIN_PAGE_RATIO)
  );
}

export function packPages(
  blocks: ReadonlyArray<PackBlock>,
  contentHeightPx: number,
  gapPx: number = 0,
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

    if (currentHeight + gap + block.heightPx <= contentHeightPx) {
      currentPage.push(block.id);
      currentHeight += gap + block.heightPx;
      continue;
    }

    if (isSplittable(block, contentHeightPx)) {
      let firstFragment = true;

      for (const fragment of block.fragments) {
        // Fragments of one entry are continuous: only the first pays the page
        // gap before the entry, the rest follow on directly.
        const fragmentGap = firstFragment ? gap : 0;

        if (
          currentHeight + fragmentGap + fragment.heightPx <=
          contentHeightPx
        ) {
          currentPage.push(fragment.id);
          currentHeight += fragmentGap + fragment.heightPx;
        } else {
          flush();

          if (fragment.heightPx > contentHeightPx) {
            overflowPx += fragment.heightPx - contentHeightPx;
          }

          currentPage.push(fragment.id);
          currentHeight = fragment.heightPx;
        }

        firstFragment = false;
      }

      continue;
    }

    flush();

    if (block.heightPx > contentHeightPx) {
      overflowPx += block.heightPx - contentHeightPx;
    }

    currentPage.push(block.id);
    currentHeight = block.heightPx;
  }

  flush();

  if (pages.length === 0) {
    pages.push([]);
  }

  return { pages, overflowPx };
}
