import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

import { HeaderSlot } from "../shared/HeaderSlot";
import { SectionRenderer } from "../shared/SectionRenderer";
import { buildTemplateThemeStyle } from "../shared/templateTheme";
import { isStudioSidebarBlock } from "./sidebarSections";
import "./studio.css";

export type StudioSidebarTemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
  /** Preview-only 6-Second Recruiter Scan. Never set by print or measurement. */
  scanHighlight?: boolean;
};

export function StudioSidebarTemplate({
  doc,
  pages,
  pageIndex,
  scanHighlight = false,
}: StudioSidebarTemplateProps) {
  const firstPage = pages[0] ?? [...DEFAULT_SECTION_ORDER];
  const pageIds = pages[pageIndex] ?? firstPage;
  const hasHeader = pageIds.includes(HEADER_BLOCK_ID);

  // Packing already caps Page 1's side column at one page height; pinned blocks
  // that did not fit were routed into the main flow on Page 2+. The aside
  // therefore owns exactly the sidebar ids assigned to Page 1, and any sidebar
  // block on a later page renders at full width with that page's main content.
  const sidebarIds = (pages.length > 0 ? pages[0] : firstPage).filter(
    isStudioSidebarBlock,
  );
  const mainIds = pageIds.filter(
    (id) => id !== HEADER_BLOCK_ID && !sidebarIds.includes(id),
  );
  const showSidebar = pageIndex === 0 && sidebarIds.length > 0;

  return (
    <div className="onyx onyx--studio" style={buildTemplateThemeStyle(doc)}>
      {hasHeader ? <HeaderSlot doc={doc} /> : null}
      <div
        className={`studio-layout${showSidebar ? "" : " studio-layout--full"}`}
      >
        <main className="page-stack studio-main">
          <SectionRenderer
            doc={doc}
            pageSectionIds={mainIds}
            scanHighlight={scanHighlight}
          />
        </main>
        {showSidebar ? (
          <aside className="studio-sidebar" aria-label="At a glance">
            <SectionRenderer
              doc={doc}
              pageSectionIds={sidebarIds}
              scanHighlight={scanHighlight}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
