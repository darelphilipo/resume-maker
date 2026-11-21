import { decodeBlock } from "./blockIds";
import { HEADER_BLOCK_ID } from "./constants";
import { packPages, type PackedPages } from "./packPages";
import { buildPackBlocks, type SectionPlan } from "./sectionPlans";

export type ComputePagesInput = {
  sectionIds: readonly string[];
  heights: Readonly<Record<string, number>>;
  headerHeightPx: number;
  gapPx: number;
  contentHeightPx: number;
  startOnNewPage?: ReadonlySet<string>;
  /** When supplied, multi-entry sections become one packing block per entry. */
  plans?: readonly SectionPlan[];
  /**
   * Sections the active template always renders on Page 1, whatever page
   * packing put them on (the Studio Sidebar's side column). A trailing page
   * left with only these blocks is folded back into Page 1 so relocating them
   * cannot produce a blank last page — and the blocks stay in `pages` so the
   * template can still find them.
   */
  pinnedToFirstPage?: ReadonlySet<string>;
};

function isPinnedBlock(id: string, pinned: ReadonlySet<string>): boolean {
  const block = decodeBlock(id);

  return block.kind === "section" && pinned.has(block.sectionId);
}

function foldPinnedTrailingPages(
  packed: PackedPages,
  pinned: ReadonlySet<string>,
): PackedPages {
  const pages = packed.pages.map((page) => [...page]);

  // Find the trailing run of pinned-only pages, then move the whole run onto
  // Page 1 in its original order so sidebar sections keep their canonical
  // order.
  let firstFolded = pages.length;

  while (firstFolded > 1) {
    const page = pages[firstFolded - 1];

    if (!page.every((id) => isPinnedBlock(id, pinned))) {
      break;
    }

    firstFolded -= 1;
  }

  if (firstFolded === pages.length) {
    return { pages, overflowPx: packed.overflowPx };
  }

  const folded = pages.splice(firstFolded);

  pages[0].push(...folded.flat());

  return { pages, overflowPx: packed.overflowPx };
}

export function computePages(input: ComputePagesInput): PackedPages {
  const sectionBlocks = input.plans
    ? buildPackBlocks(input.plans, input.heights, input.startOnNewPage)
    : input.sectionIds.flatMap((id) => {
        const heightPx = input.heights[id] ?? 0;

        if (heightPx <= 0) {
          return [];
        }

        return [
          {
            id,
            heightPx,
            startOnNewPage: input.startOnNewPage?.has(id) ?? false,
          },
        ];
      });

  const packed = packPages(
    [
      { id: HEADER_BLOCK_ID, heightPx: input.headerHeightPx },
      ...sectionBlocks,
    ],
    input.contentHeightPx,
    input.gapPx,
  );

  return input.pinnedToFirstPage && input.pinnedToFirstPage.size > 0
    ? foldPinnedTrailingPages(packed, input.pinnedToFirstPage)
    : packed;
}
