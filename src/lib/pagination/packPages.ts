export type PackBlock = { id: string; heightPx: number; startOnNewPage?: boolean };

export type PackedPages = { pages: string[][]; overflowPx: number };

export function packPages(
  blocks: ReadonlyArray<PackBlock>,
  contentHeightPx: number,
): PackedPages {
  if (contentHeightPx <= 0) {
    throw new RangeError("Content height must be positive.");
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

    if (currentHeight + block.heightPx <= contentHeightPx) {
      currentPage.push(block.id);
      currentHeight += block.heightPx;
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
