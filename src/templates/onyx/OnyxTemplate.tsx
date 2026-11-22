import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

import { HeaderSlot } from "../shared/HeaderSlot";
import { SectionRenderer } from "../shared/SectionRenderer";
import { buildTemplateThemeStyle } from "../shared/templateTheme";
import "./onyx.css";

export type OnyxTemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
  /** Appended as `onyx--<variant>` so a layout can restyle the shared DOM. */
  variant?: string;
  /** Preview-only 6-Second Recruiter Scan. Never set by print or measurement. */
  scanHighlight?: boolean;
};

export function OnyxTemplate({
  doc,
  pages,
  pageIndex,
  variant,
  scanHighlight = false,
}: OnyxTemplateProps) {
  const ids = pages[pageIndex] ?? [...DEFAULT_SECTION_ORDER];
  const hasHeader = ids.includes(HEADER_BLOCK_ID);
  const sectionIds = ids.filter((id) => id !== HEADER_BLOCK_ID);
  const themeStyle = buildTemplateThemeStyle(doc);
  const rootClass = variant ? `onyx onyx--${variant}` : "onyx";

  return (
    <div className={rootClass} style={themeStyle}>
      {hasHeader ? <HeaderSlot doc={doc} /> : null}
      <main className="page-stack">
        <SectionRenderer
          doc={doc}
          pageSectionIds={sectionIds}
          scanHighlight={scanHighlight}
        />
      </main>
    </div>
  );
}
