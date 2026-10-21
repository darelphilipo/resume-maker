"use client";

import { SECTION_IDS, type SectionId } from "@/lib/schema/resume.schema";

import { BasicsForm } from "./BasicsForm";
import { CustomSectionForm } from "./CustomSectionForm";
import { EducationForm } from "./EducationForm";
import { ExperienceForm } from "./ExperienceForm";
import { GenericSectionForm } from "./GenericSectionForm";
import { ProjectsForm } from "./ProjectsForm";
import { SkillsForm } from "./SkillsForm";
import { SummaryForm } from "./SummaryForm";
import {
  GENERIC_SECTION_FIELDS,
  type GenericSectionId,
} from "./sectionFields";

const SECTION_ID_SET = new Set<string>(SECTION_IDS);

function isSectionId(id: string): id is SectionId {
  return SECTION_ID_SET.has(id);
}

function isGenericSectionId(id: string): id is GenericSectionId {
  return id in GENERIC_SECTION_FIELDS;
}

export function SectionForm({ sectionId }: { sectionId: string }) {
  if (sectionId === "basics") {
    return <BasicsForm />;
  }

  if (sectionId === "summary") {
    return <SummaryForm />;
  }

  if (isGenericSectionId(sectionId)) {
    return <GenericSectionForm sectionId={sectionId} />;
  }

  if (isSectionId(sectionId)) {
    switch (sectionId) {
      case "experience":
        return <ExperienceForm />;
      case "education":
        return <EducationForm />;
      case "projects":
        return <ProjectsForm />;
      case "skills":
        return <SkillsForm />;
      default:
        return <GenericSectionForm sectionId={sectionId} />;
    }
  }

  return <CustomSectionForm sectionId={sectionId} />;
}
