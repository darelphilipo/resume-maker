import type { ComponentType } from "react";

import type { ResumeDocument, TemplateId } from "@/lib/schema/resume.schema";

import { OnyxTemplate } from "./onyx/OnyxTemplate";
import { StudioSidebarTemplate } from "./studio/StudioSidebarTemplate";
import {
  CompactOnePagerTemplate,
  HybridSkillsTemplate,
  IvyExecutiveTemplate,
  ModernAccentTemplate,
} from "./variants/Variants";

export type TemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
  /** Preview-only 6-Second Recruiter Scan; print/measure never set it. */
  scanHighlight?: boolean;
};

export type TemplateDefinition = {
  id: TemplateId;
  label: string;
  description: string;
  columns: 1 | 2;
  /** A single linear column keeps the PDF friendly to applicant-tracking parsers. */
  atsSafe: boolean;
  /** Shown instead of the ATS badge when the layout is not single-column. */
  badge?: string;
  Component: ComponentType<TemplateProps>;
};

const ENGINEERING_CLASSIC: TemplateDefinition = {
  id: "onyx",
  label: "Engineering Classic (Jake)",
  description: "Clean, dense single column that reads well everywhere.",
  columns: 1,
  atsSafe: true,
  Component: OnyxTemplate,
};

const IVY_EXECUTIVE: TemplateDefinition = {
  id: "persian",
  label: "Ivy/Executive (Harvard)",
  description: "Serif headings and a centered, traditional header.",
  columns: 1,
  atsSafe: true,
  Component: IvyExecutiveTemplate,
};

const MODERN_ACCENT: TemplateDefinition = {
  id: "bronzor",
  label: "Modern Accent",
  description: "Brand-colored name and section rules.",
  columns: 1,
  atsSafe: true,
  Component: ModernAccentTemplate,
};

const COMPACT_ONE_PAGER: TemplateDefinition = {
  id: "chikorita",
  label: "Compact 1-Pager",
  description: "Tighter type and spacing that fits more onto one page.",
  columns: 1,
  atsSafe: true,
  Component: CompactOnePagerTemplate,
};

const HYBRID_SKILLS: TemplateDefinition = {
  id: "azurill",
  label: "Hybrid Skills-First",
  description: "Skills are highlighted in a scannable panel.",
  columns: 1,
  atsSafe: true,
  Component: HybridSkillsTemplate,
};

const STUDIO_SIDEBAR: TemplateDefinition = {
  id: "gengar",
  label: "Studio Sidebar",
  description: "Two-column layout with a narrow at-a-glance sidebar.",
  columns: 2,
  atsSafe: false,
  badge: "Human review",
  Component: StudioSidebarTemplate,
};

export const TEMPLATES: Partial<Record<TemplateId, TemplateDefinition>> = {
  onyx: ENGINEERING_CLASSIC,
  persian: IVY_EXECUTIVE,
  bronzor: MODERN_ACCENT,
  chikorita: COMPACT_ONE_PAGER,
  azurill: HYBRID_SKILLS,
  gengar: STUDIO_SIDEBAR,
};

/** Stable display order for the template picker. */
export const TEMPLATE_LIST: readonly TemplateDefinition[] = [
  ENGINEERING_CLASSIC,
  IVY_EXECUTIVE,
  MODERN_ACCENT,
  COMPACT_ONE_PAGER,
  HYBRID_SKILLS,
  STUDIO_SIDEBAR,
];

export function getTemplate(id: TemplateId): TemplateDefinition {
  return TEMPLATES[id] ?? ENGINEERING_CLASSIC;
}
