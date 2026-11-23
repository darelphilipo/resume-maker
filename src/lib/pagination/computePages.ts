import { decodeBlock } from "./blockIds";
import { HEADER_BLOCK_ID } from "./constants";
import { packPages, type PackBlock, type PackedPages } from "./packPages";
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
   * Sections the active template always renders on Page 1 in a separate column
   * (the Studio Sidebar's side column). Their blocks are packed independently
   * of the main page flow and appended to Page 1, so they neither consume the
   * main column's height budget on Page 2+ nor disappear from `pages` — the
   * template still finds them through `pages.flat()`.
   */
  pinnedToFirstPage?: ReadonlySet<string>;
};

function isPinnedBlock(id: string, pinned: ReadonlySet<string>): boolean {
  const block = decodeBlock(id);

  return block.kind === "section" && pinned.has(block.sectionId);
}

/**
 * A template that pins blocks to Page 1 (the Studio Sidebar) renders them in a
 * separate column beside the main content, whatever page packing assigned them.
 * Packing those blocks in the shared sequence charges their height to the main
 * column of Page 2+, so trailing main sections such as Awards get stranded on
 * an almost empty extra page. Pack the main column alone with the whole page
 * budget, then move every pinned block into Page 1 in canonical order — the
 * template still finds them through `pages.flat()`.
 */
function packWithPinnedBlocks(
  header: PackBlock,
  sectionBlocks: readonly PackBlock[],
  contentHeightPx: number,
  gapPx: number,
  pinned: ReadonlySet<string>,
): PackedPages {
  const mainBlocks: PackBlock[] = [];
  const pinnedBlocks: PackBlock[] = [];

  for (const block of sectionBlocks) {
    if (isPinnedBlock(block.id, pinned)) {
      pinnedBlocks.push(block);
    } else {
      mainBlocks.push(block);
    }
  }

  const packed = packPages([header, ...mainBlocks], contentHeightPx, gapPx);
  const pages = packed.pages.map((page) => [...page]);

  pages[0].push(...pinnedBlocks.map((block) => block.id));

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

  const header: PackBlock = {
    id: HEADER_BLOCK_ID,
    heightPx: input.headerHeightPx,
  };

  return input.pinnedToFirstPage && input.pinnedToFirstPage.size > 0
    ? packWithPinnedBlocks(
        header,
        sectionBlocks,
        input.contentHeightPx,
        input.gapPx,
        input.pinnedToFirstPage,
      )
    : packPages([header, ...sectionBlocks], input.contentHeightPx, input.gapPx);
}
