import { OnyxTemplate, type OnyxTemplateProps } from "../onyx/OnyxTemplate";
import "./variants.css";

/**
 * The four single-column layouts beyond Onyx share the exact same DOM as the
 * base template. Only a root class changes, so ATS text, measurements and page
 * breaks stay identical while the printed look is distinct.
 */
function singleColumnVariant(variant: string) {
  return function VariantTemplate(props: OnyxTemplateProps) {
    return <OnyxTemplate {...props} variant={variant} />;
  };
}

/** Ivy / Executive (Harvard) — serif, centred, traditional. */
export const IvyExecutiveTemplate = singleColumnVariant("ivy");

/** Modern Accent — brand-coloured name and section rules. */
export const ModernAccentTemplate = singleColumnVariant("accent");

/** Compact 1-Pager — tighter type and spacing. */
export const CompactOnePagerTemplate = singleColumnVariant("compact");

/** Hybrid Skills-First — skills are given a highlighted panel. */
export const HybridSkillsTemplate = singleColumnVariant("skills-first");
