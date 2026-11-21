"use client";

import {
  ArrowDown,
  ArrowUp,
  CaretDown,
  CaretUp,
  Eye,
  EyeSlash,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useState } from "react";

import { newId } from "@/lib/schema/defaults";
import {
  CustomSectionSchema,
  DEFAULT_SECTION_ORDER,
  SECTION_IDS,
  type SectionId,
} from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { SectionForm } from "./SectionForm";
import { TextInput } from "./SectionFormControls";
import { useDebouncedCommit } from "./useDebouncedCommit";

const SECTION_ID_SET = new Set<string>(SECTION_IDS);

const OPTIONAL_SECTION_IDS = new Set<string>([
  "awards",
  "languages",
  "interests",
  "volunteer",
  "publications",
  "references",
]);

const DEFAULT_SECTION_TITLES: Record<SectionId, string> = {
  profiles: "Profiles",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  awards: "Awards",
  languages: "Languages",
  interests: "Interests",
  volunteer: "Volunteer",
  publications: "Publications",
  references: "References",
};

function isSectionId(id: string): id is SectionId {
  return SECTION_ID_SET.has(id);
}

function defaultTitle(id: string): string {
  if (id === "summary") {
    return "Summary";
  }

  return isSectionId(id) ? DEFAULT_SECTION_TITLES[id] : "Custom section";
}

/** Shared surface so every section action fills one ordered grid cell. */
const SECTION_ACTION_CLASS =
  "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-black/10 px-2 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:bg-transparent";

type SectionRow = {
  id: string;
  title: string;
  count: number;
  hidden: boolean;
};

export type SectionListEntry = {
  id: string;
  title: string;
};

export type SectionListProps = {
  onOpenSection?: (entry: SectionListEntry) => void;
  /** Section currently edited in the drawer; its inline form is unmounted. */
  openSectionId?: string | null;
};

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function buildRows(
  doc: ReturnType<typeof useResumeStore.getState>["doc"],
): SectionRow[] {
  const customSections = doc.customSections;
  const knownIds = [
    ...DEFAULT_SECTION_ORDER,
    ...customSections.map((section) => section.id),
  ];
  const firstPage = doc.metadata.layout.pages[0];
  const main = firstPage?.main ?? knownIds;
  const seen = new Set<string>();
  const orderedIds: string[] = [];

  for (const id of [...main, ...knownIds]) {
    if (seen.has(id) || !knownIds.includes(id)) {
      continue;
    }

    seen.add(id);
    orderedIds.push(id);
  }

  return orderedIds.map((id) => {
    if (id === "summary") {
      return {
        id,
        title: doc.summary.title || defaultTitle(id),
        count: doc.summary.content.trim() === "" ? 0 : 1,
        hidden: doc.summary.hidden,
      };
    }

    if (isSectionId(id)) {
      const section = doc.sections[id];

      return {
        id,
        title: section.title || defaultTitle(id),
        count: section.items.length,
        hidden: section.hidden,
      };
    }

    const section = customSections.find((candidate) => candidate.id === id);

    return {
      id,
      title: section?.title || defaultTitle(id),
      count: section?.items.length ?? 0,
      hidden: section?.hidden ?? false,
    };
  });
}

function SectionHeadingInput({
  row,
  onCommit,
}: {
  row: SectionRow;
  onCommit: (title: string) => void;
}) {
  const [draft, setDraft] = useState(row.title);
  const [lastTitle, setLastTitle] = useState(row.title);

  if (row.title !== lastTitle) {
    setLastTitle(row.title);
    setDraft(row.title);
  }

  useDebouncedCommit(draft, (next) => {
    const trimmed = next.trim();

    if (trimmed !== row.title.trim()) {
      onCommit(trimmed);
    }
  });

  return (
    <TextInput
      id={`section-heading-${row.id}`}
      label="Section heading"
      value={draft}
      onChange={setDraft}
      placeholder={defaultTitle(row.id)}
      hint="Leave blank to hide this heading."
    />
  );
}

export function SectionList({
  onOpenSection,
  openSectionId,
}: SectionListProps) {
  const doc = useResumeStore((state) => state.doc);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revealedOptional, setRevealedOptional] = useState<string[]>([]);
  const [optionalMenuOpen, setOptionalMenuOpen] = useState(false);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const rows = buildRows(doc);

  function isOptionalTucked(row: SectionRow): boolean {
    return (
      OPTIONAL_SECTION_IDS.has(row.id) &&
      row.count === 0 &&
      !row.hidden &&
      !revealedOptional.includes(row.id)
    );
  }

  const visibleRows = rows.filter((row) => !isOptionalTucked(row));
  const tuckedRows = rows.filter(isOptionalTucked);

  function addOptionalSection(row: SectionRow): void {
    setRevealedOptional((current) =>
      current.includes(row.id) ? current : [...current, row.id],
    );
    setExpandedId(row.id);
    setOptionalMenuOpen(false);
  }

  function toggleVisibility(row: SectionRow): void {
    const hidden = !row.hidden;

    if (row.id === "summary") {
      patchDoc({ summary: { hidden } });
      return;
    }

    if (isSectionId(row.id)) {
      patchDoc({ sections: { [row.id]: { hidden } } });
      return;
    }

    patchDoc({
      customSections: doc.customSections.map((section) =>
        section.id === row.id ? { ...section, hidden } : section,
      ),
    });
  }

  function moveRow(row: SectionRow, direction: -1 | 1): void {
    const visibleIds = visibleRows.map((candidate) => candidate.id);
    const index = visibleIds.indexOf(row.id);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= visibleIds.length) {
      return;
    }

    const currentId = visibleIds[index];
    const targetId = visibleIds[nextIndex];
    visibleIds[index] = targetId;
    visibleIds[nextIndex] = currentId;

    let visibleCursor = 0;
    const nextOrder = rows.map((candidate) =>
      isOptionalTucked(candidate)
        ? candidate.id
        : visibleIds[visibleCursor++],
    );

    const firstPage = doc.metadata.layout.pages[0] ?? {
      fullWidth: false,
      main: [...DEFAULT_SECTION_ORDER],
      sidebar: [],
    };

    patchDoc({
      metadata: {
        layout: {
          pages: [
            { ...firstPage, main: nextOrder },
            ...doc.metadata.layout.pages.slice(1),
          ],
        },
      },
    });
  }

  function renameSection(row: SectionRow, title: string): void {
    if (row.id === "summary") {
      patchDoc({ summary: { title } });
      return;
    }

    if (isSectionId(row.id)) {
      patchDoc({ sections: { [row.id]: { title } } });
      return;
    }

    patchDoc({
      customSections: doc.customSections.map((section) =>
        section.id === row.id ? { ...section, title } : section,
      ),
    });
  }

  function addCustomSection(): void {
    const title = customTitle.trim();

    if (title === "") {
      return;
    }

    const section = CustomSectionSchema.parse({ id: newId(), title });
    const firstPage = doc.metadata.layout.pages[0] ?? {
      fullWidth: false,
      main: [...DEFAULT_SECTION_ORDER],
      sidebar: [],
    };

    patchDoc({
      customSections: [...doc.customSections, section],
      metadata: {
        layout: {
          pages: [
            { ...firstPage, main: [...firstPage.main, section.id] },
            ...doc.metadata.layout.pages.slice(1),
          ],
        },
      },
    });

    setCustomTitle("");
    setCustomFormOpen(false);
    setExpandedId(section.id);
  }

  function deleteCustomSection(row: SectionRow): void {
    patchDoc({
      customSections: doc.customSections.filter(
        (section) => section.id !== row.id,
      ),
      metadata: {
        layout: {
          pages: doc.metadata.layout.pages.map((page) => ({
            ...page,
            main: page.main.filter((id) => id !== row.id),
            sidebar: page.sidebar.filter((id) => id !== row.id),
          })),
        },
      },
    });

    setConfirmDeleteId(null);
    setExpandedId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {visibleRows.map((row, index) => {
          const isExpanded = expandedId === row.id;
          const isCustomRow = !isSectionId(row.id) && row.id !== "summary";
          const atStart = index === 0;
          const atEnd = index === visibleRows.length - 1;
          const bodyId = `section-body-${row.id}`;

          return (
            <li
              key={row.id}
              className="min-w-0 overflow-hidden rounded-xl border border-black/10 bg-background"
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={bodyId}
                onClick={() => setExpandedId(isExpanded ? null : row.id)}
                className="flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {isExpanded ? (
                  <CaretUp size={16} aria-hidden data-chevron="up" className="mt-0.5 shrink-0 text-primary" />
                ) : (
                  <CaretDown size={16} aria-hidden data-chevron="down" className="mt-0.5 shrink-0 opacity-60" />
                )}
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug">
                  {row.title}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    row.hidden
                      ? "bg-amber-100 text-amber-900"
                      : "bg-black/5 opacity-70"
                  }`}
                >
                  {row.hidden ? "Hidden" : countLabel(row.count)}
                </span>
              </button>

              {isExpanded ? (
                <div
                  id={bodyId}
                  className="flex min-w-0 flex-col gap-3 border-t border-black/10 px-4 py-3"
                >
                  {/* Custom section titles are edited inside CustomSectionForm. */}
                  {isCustomRow ? null : (
                    <SectionHeadingInput
                      row={row}
                      onCommit={(title) => renameSection(row, title)}
                    />
                  )}
                  {/*
                   * The drawer owns this section's editor while it is open.
                   * Rendering the inline copy as well mounts two forms (and two
                   * TipTap editors per rich-text field) at once, which stalls
                   * the drawer on phones and duplicates entry field ids.
                   */}
                  {row.id === openSectionId ? null : (
                    <SectionForm sectionId={row.id} />
                  )}
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                    <button
                      type="button"
                      aria-label={
                        row.hidden ? `Show ${row.title}` : `Hide ${row.title}`
                      }
                      aria-pressed={!row.hidden}
                      onClick={() => toggleVisibility(row)}
                      className={SECTION_ACTION_CLASS}
                    >
                      {row.hidden ? (
                        <EyeSlash size={16} aria-hidden />
                      ) : (
                        <Eye size={16} aria-hidden />
                      )}
                      <span>{row.hidden ? "Show" : "Hide"}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${row.title} up`}
                      disabled={atStart}
                      onClick={() => moveRow(row, -1)}
                      className={`${SECTION_ACTION_CLASS} whitespace-nowrap`}
                    >
                      <ArrowUp size={16} aria-hidden />
                      <span>Move up</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${row.title} down`}
                      disabled={atEnd}
                      onClick={() => moveRow(row, 1)}
                      className={`${SECTION_ACTION_CLASS} whitespace-nowrap`}
                    >
                      <ArrowDown size={16} aria-hidden />
                      <span>Move down</span>
                    </button>
                    {onOpenSection ? (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSection({ id: row.id, title: row.title })
                        }
                        className={`${SECTION_ACTION_CLASS} lg:hidden`}
                      >
                        Open section editor
                      </button>
                    ) : null}
                    {isCustomRow ? (
                      confirmDeleteId === row.id ? (
                        <div className="col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 lg:col-span-3">
                          <p className="text-sm text-red-900">
                            Delete “{row.title}” and all its entries?
                          </p>
                          <button
                            type="button"
                            onClick={() => deleteCustomSection(row)}
                            className="inline-flex min-h-11 items-center rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            Confirm delete section
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="inline-flex min-h-11 items-center rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            Cancel delete section
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Delete ${row.title} section`}
                          onClick={() => setConfirmDeleteId(row.id)}
                          className="col-span-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:border-red-400 active:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:col-span-3"
                        >
                          <Trash size={16} aria-hidden />
                          <span>Delete section</span>
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {tuckedRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={optionalMenuOpen}
            aria-controls="optional-sections-menu"
            onClick={() => setOptionalMenuOpen((open) => !open)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 px-3 py-2 text-sm font-medium transition-colors hover:border-black/40 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden />
            <span>Add optional section</span>
            <CaretDown
              size={16}
              aria-hidden
              className={`opacity-60 transition-transform ${
                optionalMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {optionalMenuOpen ? (
            <div
              id="optional-sections-menu"
              role="group"
              aria-label="Optional sections"
              className="flex flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-2"
            >
              {tuckedRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => addOptionalSection(row)}
                  className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-black/10 bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="min-w-0 flex-1 text-left">{row.title}</span>
                  <Plus size={16} aria-hidden className="shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {customFormOpen ? (
        <form
          aria-label="Add custom section"
          onSubmit={(event) => {
            event.preventDefault();
            addCustomSection();
          }}
          className="flex flex-col gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3"
        >
          <TextInput
            id="new-custom-section-title"
            label="Section name"
            value={customTitle}
            onChange={setCustomTitle}
            placeholder="e.g. Speaking, Patents"
            hint="Create a section for anything the standard list does not cover."
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={customTitle.trim() === ""}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30"
            >
              <Plus size={16} aria-hidden />
              <span>Add section</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomFormOpen(false);
                setCustomTitle("");
              }}
              className="inline-flex min-h-11 items-center rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCustomFormOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 px-3 py-2 text-sm font-medium transition-colors hover:border-black/40 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden />
          <span>Add custom section</span>
        </button>
      )}
    </div>
  );
}
