import type { CSSProperties } from "react";

import type { ResumeDocument } from "@/lib/schema/resume.schema";

/** Round to two decimals so preview, measurement and print agree on the value. */
export function scaledPt(value: number, fitScale: number): string {
  return `${Number((value * fitScale).toFixed(2))}pt`;
}

/**
 * The CSS custom properties shared by every template renderer and the measure
 * layer. Keeping this in one place stops a new template from drifting away
 * from pagination or the fit-to-one-page scale.
 */
export function buildTemplateThemeStyle(doc: ResumeDocument): CSSProperties {
  const { metadata } = doc;
  const fitScale = metadata.page.fitScale;

  return {
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
}
