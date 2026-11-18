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
};

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

  return packPages(
    [
      { id: HEADER_BLOCK_ID, heightPx: input.headerHeightPx },
      ...sectionBlocks,
    ],
    input.contentHeightPx,
    input.gapPx,
  );
}
