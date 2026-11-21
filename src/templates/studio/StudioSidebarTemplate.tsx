import { decodeBlock } from "@/lib/pagination/blockIds";
import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

import { HeaderSlot } from "../shared/HeaderSlot";
import { SectionRenderer } from "../shared/SectionRenderer";
import { buildTemplateThemeStyle } from "../shared/templateTheme";
import { STUDIO_SIDEBAR_SECTION_IDS } from "./sidebarSections";
import "./studio.css";

export type StudioSidebarTemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
};

/** Split sections contribute entry-level block ids; route them by the
 * underlying section id so the two columns keep the same section split. */
function sectionIdOf(id: string): string {
  const block = decodeBlock(id);
  return block.kind === "section" ? block.sectionId : id;
}

function isSidebarBlock(id: string): boolean {
  return (
    id !== HEADER_BLOCK_ID && STUDIO_SIDEBAR_SECTION_IDS.has(sectionIdOf(id))
  );
}

export function StudioSidebarTemplate({
  doc,
  pages,
  pageIndex,
}: StudioSidebarTemplateProps) {
  const firstPage = pages[0] ?? [...DEFAULT_SECTION_ORDER];
  const pageIds = pages[pageIndex] ?? firstPage;
  const hasHeader = pageIds.includes(HEADER_BLOCK_ID);

  // Packing is a single shared column in canonical order (main first, sidebar
  // last), so a tall main column pushes the short sidebar sections onto a later
  // page whose main side is empty. The sidebar is its own column, independent
  // of the main column's height: keep every sidebar block on Page 1 and let
  // later pages carry main-column overflow only.
  const sidebarIds = (pages.length > 0 ? pages.flat() : firstPage).filter(
    isSidebarBlock,
  );
  const mainIds = pageIds.filter(
    (id) => id !== HEADER_BLOCK_ID && !isSidebarBlock(id),
  );
  const showSidebar = pageIndex === 0 && sidebarIds.length > 0;

  return (
    <div className="onyx onyx--studio" style={buildTemplateThemeStyle(doc)}>
      {hasHeader ? <HeaderSlot doc={doc} /> : null}
      <div
        className={`studio-layout${showSidebar ? "" : " studio-layout--full"}`}
      >
        <main className="page-stack studio-main">
          <SectionRenderer doc={doc} pageSectionIds={mainIds} />
        </main>
        {showSidebar ? (
          <aside className="studio-sidebar" aria-label="At a glance">
            <SectionRenderer doc={doc} pageSectionIds={sidebarIds} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
