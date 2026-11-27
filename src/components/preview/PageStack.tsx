import type { CSSProperties } from "react";

import { computeFitMarginY } from "@/lib/pagination/fitScale";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { pageGeometry } from "@/lib/units/pageGeometry";
import { getTemplate } from "@/templates/registry";

import "./preview.css";

export function PageStack({
  doc,
  pages,
  scanHighlight = false,
}: {
  doc: ResumeDocument;
  pages: string[][];
  /** Preview-only 6-Second Recruiter Scan; print never enables it. */
  scanHighlight?: boolean;
}) {
  const Template = getTemplate(doc.metadata.template).Component;
  const geometry = pageGeometry(
    doc.metadata.page.format,
    doc.metadata.page.marginX,
    doc.metadata.page.marginY,
  );

  const pageVariables = {
    "--page-width": `${geometry.widthMm}mm`,
    "--page-height": `${geometry.heightMm}mm`,
    "--page-margin-x": `${doc.metadata.page.marginX}pt`,
    "--page-margin-y": `${computeFitMarginY(
      doc.metadata.page.marginY,
      doc.metadata.page.fitScale,
    )}pt`,
  } as CSSProperties;

  return (
    <div
      className={`resume-print-root resume-pages${
        scanHighlight ? " resume-scan" : ""
      }`}
      data-scan-highlight={scanHighlight ? "true" : undefined}
      style={pageVariables}
    >
      {pages.map((_, index) => (
        <div
          key={index}
          className="resume-page"
          data-page={index + 1}
        >
          <Template
            doc={doc}
            pages={pages}
            pageIndex={index}
            scanHighlight={scanHighlight}
          />
        </div>
      ))}
    </div>
  );
}
