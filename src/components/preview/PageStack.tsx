import type { CSSProperties } from "react";

import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { pageGeometry } from "@/lib/units/pageGeometry";
import { getTemplate } from "@/templates/registry";

import "./preview.css";

export function PageStack({
  doc,
  pages,
}: {
  doc: ResumeDocument;
  pages: string[][];
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
    "--page-margin-y": `${doc.metadata.page.marginY}pt`,
  } as CSSProperties;

  return (
    <div
      className="resume-print-root resume-pages"
      style={pageVariables}
    >
      {pages.map((_, index) => (
        <div
          key={index}
          className="resume-page"
          data-page={index + 1}
        >
          <Template doc={doc} pages={pages} pageIndex={index} />
        </div>
      ))}
    </div>
  );
}
