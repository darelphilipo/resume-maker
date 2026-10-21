"use client";

import {
  ArrowDown,
  ArrowUp,
  CaretDown,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";
import { useState } from "react";

import {
  DEFAULT_SECTION_ORDER,
  SECTION_IDS,
  type SectionId,
} from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { SectionForm } from "./SectionForm";

const SECTION_ID_SET = new Set<string>(SECTION_IDS);

function isSectionId(id: string): id is SectionId {
  return SECTION_ID_SET.has(id);
}

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
        title: doc.summary.title || "Summary",
        count: doc.summary.content.trim() === "" ? 0 : 1,
        hidden: doc.summary.hidden,
      };
    }

    if (isSectionId(id)) {
      const section = doc.sections[id];

      return {
        id,
        title: section.title || id,
        count: section.items.length,
        hidden: section.hidden,
      };
    }

    const section = customSections.find((candidate) => candidate.id === id);

    return {
      id,
      title: section?.title || id,
      count: section?.items.length ?? 0,
      hidden: section?.hidden ?? false,
    };
  });
}

export function SectionList({ onOpenSection }: SectionListProps) {
  const doc = useResumeStore((state) => state.doc);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rows = buildRows(doc);

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
    const index = rows.findIndex((candidate) => candidate.id === row.id);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= rows.length) {
      return;
    }

    const nextOrder = rows.map((candidate) => candidate.id);
    const currentId = nextOrder[index];
    const targetId = nextOrder[nextIndex];
    nextOrder[index] = targetId;
    nextOrder[nextIndex] = currentId;

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

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, index) => {
        const isExpanded = expandedId === row.id;
        const atStart = index === 0;
        const atEnd = index === rows.length - 1;
        const bodyId = `section-body-${row.id}`;

        return (
          <li
            key={row.id}
            className="overflow-hidden rounded-xl border border-black/10 bg-background"
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={bodyId}
              onClick={() => setExpandedId(isExpanded ? null : row.id)}
              className="flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <CaretDown
                size={16}
                aria-hidden
                className={`mt-0.5 shrink-0 opacity-60 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
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
                className="flex flex-col gap-3 border-t border-black/10 px-4 py-3"
              >
                <SectionForm sectionId={row.id} />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label={
                      row.hidden ? `Show ${row.title}` : `Hide ${row.title}`
                    }
                    aria-pressed={!row.hidden}
                    onClick={() => toggleVisibility(row)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:bg-transparent"
                  >
                    <ArrowUp size={16} aria-hidden />
                    <span>Move up</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${row.title} down`}
                    disabled={atEnd}
                    onClick={() => moveRow(row, 1)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:bg-transparent"
                  >
                    <ArrowDown size={16} aria-hidden />
                    <span>Move down</span>
                  </button>
                </div>
                {onOpenSection ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenSection({ id: row.id, title: row.title })
                    }
                    className="mt-1 inline-flex min-h-11 w-fit items-center justify-center rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
                  >
                    Open section editor
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
