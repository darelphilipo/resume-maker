import type { CSSProperties } from "react";

import {
  DEFAULT_SECTION_ORDER,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";

import { HeaderSlot } from "../shared/HeaderSlot";
import { SectionRenderer } from "../shared/SectionRenderer";
import styles from "./onyx.module.css";

export type OnyxTemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
};

export function OnyxTemplate({ doc, pages, pageIndex }: OnyxTemplateProps) {
  const page = pages[pageIndex];
  const sectionIds = page ?? [...DEFAULT_SECTION_ORDER];
  const { metadata } = doc;

  const themeStyle = {
    "--resume-font-size": `${metadata.typography.body.fontSize}pt`,
    "--resume-line-height": String(metadata.typography.body.lineHeight),
    "--resume-heading-size": `${metadata.typography.heading.fontSize}pt`,
    "--resume-heading-font": metadata.typography.heading.fontFamily,
    "--page-gap-y": `${metadata.page.gapY}pt`,
    "--page-gap-x": `${metadata.page.gapX}pt`,
    "--page-margin-x": `${metadata.page.marginX}pt`,
    "--page-margin-y": `${metadata.page.marginY}pt`,
    "--item-gap": "6pt",
    "--brand-primary": metadata.design.colors.primary,
    fontFamily: metadata.typography.body.fontFamily,
    color: metadata.design.colors.text,
    background: metadata.design.colors.background,
  } as CSSProperties;

  return (
    <div className={styles.onyx} style={themeStyle}>
      <HeaderSlot doc={doc} />
      <main className="page-stack">
        <SectionRenderer doc={doc} pageSectionIds={sectionIds} />
      </main>
    </div>
  );
}
