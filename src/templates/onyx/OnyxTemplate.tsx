import type { CSSProperties } from "react";

import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

import { HeaderSlot } from "../shared/HeaderSlot";
import { SectionRenderer } from "../shared/SectionRenderer";
import "./onyx.css";

export type OnyxTemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
};

function scaledPt(value: number, fitScale: number): string {
  return `${Number((value * fitScale).toFixed(2))}pt`;
}

export function OnyxTemplate({ doc, pages, pageIndex }: OnyxTemplateProps) {
  const ids = pages[pageIndex] ?? [...DEFAULT_SECTION_ORDER];
  const hasHeader = ids.includes(HEADER_BLOCK_ID);
  const sectionIds = ids.filter((id) => id !== HEADER_BLOCK_ID);
  const { metadata } = doc;
  const fitScale = metadata.page.fitScale;

  const themeStyle = {
    "--resume-font-size": scaledPt(metadata.typography.body.fontSize, fitScale),
    "--resume-line-height": String(metadata.typography.body.lineHeight),
    "--resume-heading-size": scaledPt(
      metadata.typography.heading.fontSize,
      fitScale,
    ),
    "--resume-heading-font": metadata.typography.heading.fontFamily,
    "--resume-fit-scale": String(fitScale),
    "--page-gap-y": scaledPt(metadata.page.gapY, fitScale),
    "--page-gap-x": scaledPt(metadata.page.gapX, fitScale),
    "--page-margin-x": `${metadata.page.marginX}pt`,
    "--page-margin-y": `${metadata.page.marginY}pt`,
    "--item-gap": scaledPt(6, fitScale),
    "--brand-primary": metadata.design.colors.primary,
    fontFamily: metadata.typography.body.fontFamily,
    color: metadata.design.colors.text,
    background: metadata.design.colors.background,
  } as CSSProperties;

  return (
    <div className="onyx" style={themeStyle}>
      {hasHeader ? <HeaderSlot doc={doc} /> : null}
      <main className="page-stack">
        <SectionRenderer doc={doc} pageSectionIds={sectionIds} />
      </main>
    </div>
  );
}
