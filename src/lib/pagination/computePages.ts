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
   * Sections the active template always renders as a separate column on Page 1
   * (the Studio Sidebar's side column). Their blocks are packed independently
   * against Page 1's remaining height, so they never consume the main column's
   * page budget.
   */
  pinnedToFirstPage?: ReadonlySet<string>;
  /**
   * Heights measured at the full content width for pinned blocks that do not
   * fit Page 1's column. Those blocks render full-width in the main flow on
   * Page 2+, so their sidebar-width height would otherwise over-report every
   * later line wrap. Falls back to the normal height for missing ids.
   */
  fullWidthHeights?: Readonly<Record<string, number>>;
};

function isPinnedBlock(id: string, pinned: ReadonlySet<string>): boolean {
  const block = decodeBlock(id);

  return block.kind === "section" && pinned.has(block.sectionId);
}

/**
 * Split the pinned (side-column) blocks into the ones that genuinely fit Page
 * 1's remaining height and the ones that must spill into the main flow. The
 * order is preserved: once one block does not fit, every later block spills,
 * so a small trailing section can never jump ahead of a taller neighbour.
 */
export function splitPinnedBlocks(
  blocks: readonly PackBlock[],
  availableHeightPx: number,
  gapPx: number,
): { pageOne: PackBlock[]; overflow: PackBlock[] } {
  const pageOne: PackBlock[] = [];
  const overflow: PackBlock[] = [];
  let usedHeightPx = 0;

  for (const block of blocks) {
    const gap = pageOne.length > 0 ? gapPx : 0;
    const fits =
      overflow.length === 0 &&
      block.heightPx <= availableHeightPx &&
      usedHeightPx + gap + block.heightPx <= availableHeightPx;

    if (fits) {
      pageOne.push(block);
      usedHeightPx += gap + block.heightPx;
    } else {
      overflow.push(block);
    }
  }

  return { pageOne, overflow };
}

/**
 * A template that pins blocks to Page 1 (the Studio Sidebar) renders them in a
 * separate column beside the main content. Two traps follow:
 *
 * 1. Packing those blocks in the shared sequence charges their height to the
 *    main column of Page 2+, which strands trailing main sections (Awards) on
 *    an almost empty extra page.
 * 2. Appending *every* pinned block to Page 1 (the previous behaviour) lets a
 *    tall sidebar grow the whole `.studio-layout` grid past one printable page,
 *    so Chrome pushes the grid to Page 2 and `Save as PDF` starts with a blank
 *    page holding only the header.
 *
 * The sidebar column is therefore packed against Page 1's remaining height.
 * Blocks that fit stay on Page 1 (the template finds them through `pages[0]`);
 * the rest join the main flow on Page 2+, where they render at full width. The
 * main column packs alone with the whole page budget, so Page 2 can still hold
 * a trailing section such as Awards.
 */
function packWithPinnedBlocks(
  header: PackBlock,
  sectionBlocks: readonly PackBlock[],
  contentHeightPx: number,
  gapPx: number,
  pinned: ReadonlySet<string>,
  fullWidthHeights: Readonly<Record<string, number>> = {},
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

  // The sidebar starts below the header, one root gap after it.
  const sidebarHeightPx = Math.max(
    0,
    contentHeightPx - header.heightPx - gapPx,
  );
  const { pageOne, overflow } = splitPinnedBlocks(
    pinnedBlocks,
    sidebarHeightPx,
    gapPx,
  );

  // Spilled side-column blocks render full-width in the main flow, so use the
  // width they will actually occupy. The sidebar-height fallback is
  // conservative when the second measurement has not reported yet.
  const overflowBlocks = overflow.map((block) => {
    const fullWidthHeightPx = fullWidthHeights[block.id];

    return typeof fullWidthHeightPx === "number" && fullWidthHeightPx >= 0
      ? { ...block, heightPx: fullWidthHeightPx }
      : block;
  });

  const mainPacked = packPages([header, ...mainBlocks], contentHeightPx, gapPx);
  // If the main column already spilled, the overflow blocks simply continue
  // after it. If Page 1's main column still has room, force the spill onto
  // Page 2 so Page 1 keeps exactly the side column it was packed for.
  const startsOnNewPage =
    overflowBlocks.length > 0 && mainPacked.pages.length === 1;
  const flowBlocks = overflowBlocks.map((block, index) =>
    startsOnNewPage && index === 0
      ? { ...block, startOnNewPage: true }
      : block,
  );

  const packed = packPages(
    [header, ...mainBlocks, ...flowBlocks],
    contentHeightPx,
    gapPx,
  );
  const pages = packed.pages.map((page) => [...page]);

  if (pageOne.length > 0) {
    pages[0].push(...pageOne.map((block) => block.id));
  }

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
        input.fullWidthHeights,
      )
    : packPages([header, ...sectionBlocks], input.contentHeightPx, input.gapPx);
}
