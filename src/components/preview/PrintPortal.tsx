"use client";

import { useMemo, type CSSProperties, type ReactPortal } from "react";
import { createPortal } from "react-dom";

import { printPageSizeCss } from "@/lib/print/printDocument";
import { sanitizeResumeDocument } from "@/lib/richtext/sanitize";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { pageGeometry } from "@/lib/units/pageGeometry";
import { getTemplate } from "@/templates/registry";

export function PrintPortal({
  doc,
  pages,
}: {
  doc: ResumeDocument;
  pages: string[][];
}): ReactPortal | null {
  const safeDoc = useMemo(() => sanitizeResumeDocument(doc), [doc]);

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
    "--page-margin-y": `${safeDoc.metadata.page.marginY}pt`,
  } as CSSProperties;

  return createPortal(
    <div id="print-portal" style={pageVariables}>
      {/* Runtime @page rule wins over the A4 fallback in print.css so the
          browser print dialog uses the paper size selected in Design. */}
      <style data-print-page-size>
        {printPageSizeCss(safeDoc.metadata.page.format)}
      </style>
      <div className="resume-print-root resume-pages">
        {pages.map((_, index) => (
          <div
            key={index}
            className="resume-page"
            data-page={index + 1}
          >
            <Template doc={safeDoc} pages={pages} pageIndex={index} />
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
