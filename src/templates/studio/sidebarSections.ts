import { decodeBlock } from "@/lib/pagination/blockIds";
import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";

/** Compact, scan-friendly sections that live in the narrow review column. */
export const STUDIO_SIDEBAR_SECTION_IDS: ReadonlySet<string> = new Set([
  "skills",
  "languages",
  "certifications",
  "interests",
]);

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
