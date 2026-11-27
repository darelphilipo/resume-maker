"use client";

import { useMemo, type CSSProperties, type ReactPortal } from "react";
import { createPortal } from "react-dom";

import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import { computeFitMarginY } from "@/lib/pagination/fitScale";
import { printPageSizeCss } from "@/lib/print/printDocument";
import { sanitizeResumeDocument } from "@/lib/richtext/sanitize";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { selectVisibleSectionIds } from "@/lib/store/selectors";
import { pageGeometry } from "@/lib/units/pageGeometry";
import { getTemplate } from "@/templates/registry";

/**
 * `PrintTriggerButton` can be tapped before the first measurement pass has
 * finished (most visibly from the mobile Content/Design tab). `usePageLayout`
 * then reports `[[]]`, which would print a blank sheet. Fall back to every
 * visible section on Page 1 so the captured print snapshot always contains the
 * resume instead of an empty page.
 */
export function printablePages(
  doc: ResumeDocument,
  pages: string[][],
): string[][] {
  const hasContent = pages.some((page) => page.length > 0);

  return hasContent
    ? pages
    : [[HEADER_BLOCK_ID, ...selectVisibleSectionIds({ doc })]];
}

export function PrintPortal({
  doc,
  pages,
}: {
  doc: ResumeDocument;
  pages: string[][];
}): ReactPortal | null {
  const safeDoc = useMemo(() => sanitizeResumeDocument(doc), [doc]);
  const printPages = useMemo(
    () => printablePages(safeDoc, pages),
    [safeDoc, pages],
  );

  if (typeof document === "undefined") {
    return null;
  }

  const Template = getTemplate(safeDoc.metadata.template).Component;
  const geometry = pageGeometry(
    safeDoc.metadata.page.format,
    safeDoc.metadata.page.marginX,
    safeDoc.metadata.page.marginY,
  );

  const pageVariables = {
    "--page-width": `${geometry.widthMm}mm`,
    "--page-height": `${geometry.heightMm}mm`,
    "--page-margin-x": `${safeDoc.metadata.page.marginX}pt`,
    "--page-margin-y": `${computeFitMarginY(
      safeDoc.metadata.page.marginY,
      safeDoc.metadata.page.fitScale,
    )}pt`,
  } as CSSProperties;

  return createPortal(
    <div id="print-portal" style={pageVariables}>
      {/* Runtime @page rule wins over the A4 fallback in print.css so the
          browser print dialog uses the paper size selected in Design. */}
      <style data-print-page-size>
        {printPageSizeCss(safeDoc.metadata.page.format)}
      </style>
      <div className="resume-print-root resume-pages">
        {printPages.map((_, index) => (
          <div
            key={index}
            className="resume-page"
            data-page={index + 1}
          >
            <Template doc={safeDoc} pages={printPages} pageIndex={index} />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
