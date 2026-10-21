import type { ComponentType } from "react";

import type { ResumeDocument, TemplateId } from "@/lib/schema/resume.schema";

import { OnyxTemplate } from "./onyx/OnyxTemplate";

export type TemplateProps = {
  doc: ResumeDocument;
  pages: string[][];
  pageIndex: number;
};

export type TemplateDefinition = {
  id: TemplateId;
  label: string;
  columns: 1 | 2;
  Component: ComponentType<TemplateProps>;
};

const ONYX_TEMPLATE: TemplateDefinition = {
  id: "onyx",
  label: "Onyx",
  columns: 1,
  Component: OnyxTemplate,
};

export const TEMPLATES: Partial<Record<TemplateId, TemplateDefinition>> = {
  onyx: ONYX_TEMPLATE,
};

export function getTemplate(id: TemplateId): TemplateDefinition {
  return TEMPLATES[id] ?? ONYX_TEMPLATE;
}
