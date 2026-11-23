import { decodeBlock } from "@/lib/pagination/blockIds";
import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";

/** Compact, scan-friendly sections that live in the narrow review column. */
export const STUDIO_SIDEBAR_SECTION_IDS: ReadonlySet<string> = new Set([
  "skills",
  "languages",
  "certifications",
  "interests",
]);

/**
 * Measurement ids for the full-width copy of every sidebar block. The measure
 * layer renders this copy beside the two-column grid so blocks that spill out
 * of Page 1 (and then render full-width in the main flow) are measured at the
 * width they will actually occupy. Keep the prefix out of real block ids.
 */
export const FULL_WIDTH_MEASURE_PREFIX = "__full-width:";

export function fullWidthMeasureId(id: string): string {
  return `${FULL_WIDTH_MEASURE_PREFIX}${id}`;
}

/** Strip the full-width measurement prefix, keeping only real block ids. */
export function collectFullWidthHeights(
  heights: Readonly<Record<string, number>>,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [id, heightPx] of Object.entries(heights)) {
    if (id.startsWith(FULL_WIDTH_MEASURE_PREFIX)) {
      result[id.slice(FULL_WIDTH_MEASURE_PREFIX.length)] = heightPx;
    }
  }

  return result;
}

/** Split sections contribute entry-level block ids; route them by section id. */
export function studioSectionIdOf(id: string): string {
  const block = decodeBlock(id);
  return block.kind === "section" ? block.sectionId : id;
}

export function isStudioSidebarSection(sectionId: string): boolean {
  return STUDIO_SIDEBAR_SECTION_IDS.has(sectionId);
}

export function isStudioSidebarBlock(id: string): boolean {
  return id !== HEADER_BLOCK_ID && isStudioSidebarSection(studioSectionIdOf(id));
}
