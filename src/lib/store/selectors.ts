import {
  DEFAULT_SECTION_ORDER,
  SECTION_IDS,
  type ListSection,
  type SectionId,
} from "@/lib/schema/resume.schema";

import type { ResumeStore } from "./useResumeStore";

export const PRIMARY_FIELD: Record<SectionId | "summary", string> = {
  profiles: "network",
  experience: "company",
  education: "school",
  projects: "name",
  skills: "name",
  certifications: "name",
  awards: "title",
  languages: "name",
  interests: "name",
  volunteer: "organization",
  publications: "title",
  references: "name",
  summary: "content",
};

type SectionItem = { hidden?: boolean } & Record<string, unknown>;

function isSectionId(id: string): id is SectionId {
  return (SECTION_IDS as readonly string[]).includes(id);
}

export function isDraft(sectionId: SectionId, item: SectionItem): boolean {
  const value = item[PRIMARY_FIELD[sectionId]];

  if (typeof value !== "string") {
    return true;
  }

  return value.trim() === "";
}

export function selectSection(
  state: Pick<ResumeStore, "doc">,
  id: string,
): ListSection<unknown> | null {
  if (!isSectionId(id)) {
    return null;
  }

  return state.doc.sections[id] as ListSection<unknown>;
}

export function selectVisibleSectionIds(
  state: Pick<ResumeStore, "doc">,
): string[] {
  const page = state.doc.metadata.layout.pages[0];
  const order: readonly string[] = page
    ? [...page.main, ...page.sidebar]
    : DEFAULT_SECTION_ORDER;

  const visible: string[] = [];

  for (const id of order) {
    if (id === "summary") {
      const summary = state.doc.summary;

      if (!summary.hidden && summary.content.trim() !== "") {
        visible.push(id);
      }

      continue;
    }

    const section = selectSection(state, id);

    if (section) {
      if (section.hidden) {
        continue;
      }

      const hasVisibleItem = section.items.some((item) => {
        const typed = item as SectionItem;

        return typed.hidden !== true && !isDraft(id as SectionId, typed);
      });

      if (hasVisibleItem) {
        visible.push(id);
      }

      continue;
    }

    const customSection = state.doc.customSections.find(
      (candidate) => candidate.id === id,
    );

    if (!customSection || customSection.hidden) {
      continue;
    }

    const hasVisibleCustomItem = customSection.items.some(
      (item) => item.hidden !== true && item.name.trim() !== "",
    );

    if (hasVisibleCustomItem) {
      visible.push(id);
    }
  }

  return visible;
}
