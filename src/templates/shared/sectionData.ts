import {
  SECTION_IDS,
  type ResumeDocument,
  type SectionConfig,
  type SectionId,
} from "@/lib/schema/resume.schema";

export type ItemRecord = Record<string, unknown>;
export type ListKind = SectionId | "custom";

export type ResolvedSummary = {
  kind: "summary";
  config: SectionConfig;
};

export type ResolvedList = {
  kind: ListKind;
  config: SectionConfig;
  items: ItemRecord[];
};

export type ResolvedSection = ResolvedSummary | ResolvedList;

/**
 * The field an item must have to count as present. Kept in sync with the ATS
 * renderer and the editor's `selectVisibleSectionIds`; a draft item without its
 * primary field is intentionally not printed (and therefore not measured).
 */
export const PRIMARY_FIELDS: Record<SectionId, string> = {
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
};

export function text(item: ItemRecord, field: string): string {
  const value = item[field];
  return typeof value === "string" ? value : "";
}

export function itemId(item: ItemRecord, index = 0): string {
  return typeof item.id === "string" ? item.id : `item-${index}`;
}

export function visibleItems(
  items: readonly unknown[],
  primaryField: string,
): ItemRecord[] {
  return items
    .map((item) => item as ItemRecord)
    .filter(
      (item) =>
        item.hidden !== true && text(item, primaryField).trim() !== "",
    );
}

export function resolveSection(
  doc: ResumeDocument,
  sectionId: string,
): ResolvedSection | null {
  if (sectionId === "summary") {
    if (doc.summary.hidden || doc.summary.content.trim() === "") {
      return null;
    }

    return { kind: "summary", config: doc.summary };
  }

  const customSection = doc.customSections.find(
    (section) => section.id === sectionId,
  );

  if (customSection) {
    if (customSection.hidden) {
      return null;
    }

    const items = visibleItems(customSection.items, "name");

    if (items.length === 0) {
      return null;
    }

    return { kind: "custom", config: customSection, items };
  }

  const knownSectionId = SECTION_IDS.find(
    (candidate) => candidate === sectionId,
  );

  if (!knownSectionId) {
    return null;
  }

  const section = doc.sections[knownSectionId];

  if (section.hidden) {
    return null;
  }

  const items = visibleItems(section.items, PRIMARY_FIELDS[knownSectionId]);

  if (items.length === 0) {
    return null;
  }

  return { kind: knownSectionId, config: section, items };
}
