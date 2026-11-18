import { decodeBlock } from "@/lib/pagination/blockIds";
import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

import { HeaderSlot } from "../shared/HeaderSlot";
import { SectionRenderer } from "../shared/SectionRenderer";
import { buildTemplateThemeStyle } from "../shared/templateTheme";
import "./studio.css";

export type StudioSidebarTemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
};

/** Compact, scan-friendly sections that live in the narrow review column. */
export const STUDIO_SIDEBAR_SECTION_IDS: ReadonlySet<string> = new Set([
  "skills",
  "languages",
  "certifications",
  "interests",
]);

export function StudioSidebarTemplate({
  doc,
  pages,
  pageIndex,
}: StudioSidebarTemplateProps) {
  const ids = pages[pageIndex] ?? [...DEFAULT_SECTION_ORDER];
  const hasHeader = ids.includes(HEADER_BLOCK_ID);
  const sectionIds = ids.filter((id) => id !== HEADER_BLOCK_ID);
  // Split sections contribute entry-level block ids; route them by the
  // underlying section id so the two columns keep the same section split.
  const sectionIdOf = (id: string): string => {
    const block = decodeBlock(id);
    return block.kind === "section" ? block.sectionId : id;
  };
  const mainIds = sectionIds.filter(
    (id) => !STUDIO_SIDEBAR_SECTION_IDS.has(sectionIdOf(id)),
  );
  const sidebarIds = sectionIds.filter((id) =>
    STUDIO_SIDEBAR_SECTION_IDS.has(sectionIdOf(id)),
  );

  return (
    <div className="onyx onyx--studio" style={buildTemplateThemeStyle(doc)}>
      {hasHeader ? <HeaderSlot doc={doc} /> : null}
      <div className="studio-layout">
        <main className="page-stack studio-main">
          <SectionRenderer doc={doc} pageSectionIds={mainIds} />
        </main>
        <aside className="studio-sidebar" aria-label="At a glance">
          <SectionRenderer doc={doc} pageSectionIds={sidebarIds} />
        </aside>
      </div>
    </div>
  );
}
