"use client";

import {
  CaretDown,
  CaretUp,
  DotsSixVertical,
  Eye,
  EyeSlash,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { trackEvent } from "@/lib/analytics/trackEvent";
import {
  dropTargetForPointer,
  mergeVisibleOrder,
  reorderVisibleIds,
} from "@/lib/editor/sectionOrder";
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

/** How long the jumped-to rich-text field keeps its trim highlight. */
const TRIM_FOCUS_MS = 1600;

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

/** Compact icon buttons live on the header so reorder/hide needs no expansion. */
const SECTION_HEADER_ACTION_CLASS =
  "flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-black/5 hover:text-primary active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40 disabled:hover:bg-transparent pointer-coarse:min-h-11 pointer-coarse:min-w-11";

/** Shared surface for the footer actions that still need a text label. */
const SECTION_ACTION_CLASS =
  "flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-black/10 px-2 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:bg-transparent";

/**
 * jsdom does not implement pointer capture, so every capture call is guarded.
 * In a browser the handle keeps receiving moves after the finger leaves it.
 */
function capturePointer(element: HTMLElement, pointerId: number): void {
  if (typeof element.setPointerCapture === "function") {
    element.setPointerCapture(pointerId);
  }
}

function releasePointer(element: HTMLElement, pointerId: number): void {
  if (typeof element.releasePointerCapture === "function") {
    element.releasePointerCapture(pointerId);
  }
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
  /** Section currently edited in the drawer; its inline form is unmounted. */
  openSectionId?: string | null;
  /**
   * A one-shot request to expand a section and scroll it into view. The nonce
   * lets the same section be focused again after the user collapses it (for
   * example by tapping "Manage profiles" twice). `entryId` additionally scrolls
   * to one entry card, which is how Trim tips jumps to the offending bullet.
   */
  focusSection?: {
    id: string;
    nonce: number;
    entryId?: string | null;
  } | null;
  /** Basics is owned by EditorWorkspace but shares this list's Collapse all. */
  basicsOpen?: boolean;
  onCollapseBasics?: () => void;
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
  focusSection,
  basicsOpen = false,
  onCollapseBasics,
}: SectionListProps) {
  const doc = useResumeStore((state) => state.doc);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [revealedOptional, setRevealedOptional] = useState<string[]>([]);
  const [optionalMenuOpen, setOptionalMenuOpen] = useState(false);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lastFocusNonce, setLastFocusNonce] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    overId: string | null;
  } | null>(null);
  // Pointer moves can arrive faster than React re-renders, so the live drag is
  // tracked in a ref and mirrored into state only for the visual highlight.
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    overId: string | null;
  } | null>(null);
  const rows = buildRows(doc);
  // Basics is a sibling accordion above this list, so it counts toward the
  // "Collapse all" affordance even though EditorWorkspace owns its state.
  const openCount = expandedIds.length + (basicsOpen ? 1 : 0);

  // "Manage profiles" in Basics asks this list to reveal its Profiles card.
  // Adjust state during render (the same pattern as a controlled input) so the
  // card is open before the scroll effect below runs, and so tapping the
  // shortcut again after collapsing the card still works.
  if (focusSection && focusSection.nonce !== lastFocusNonce) {
    setLastFocusNonce(focusSection.nonce);
    setExpandedIds((current) =>
      current.includes(focusSection.id) ? current : [...current, focusSection.id],
    );
  }

  useEffect(() => {
    if (!focusSection) {
      return;
    }

    const row = document.getElementById(`section-row-${focusSection.id}`);
    const entry = focusSection.entryId
      ? document.getElementById(`editor-entry-${focusSection.entryId}`)
      : null;
    const sectionBody = document.getElementById(
      `section-body-${focusSection.id}`,
    );
    // Trim tips point at a rendered bullet, so land on the form field that owns
    // it rather than the top of the section. A section-level bullet (Summary)
    // has no entry id, so the section body is its scope.
    const scope = entry ?? sectionBody ?? row;
    const field =
      scope?.querySelector<HTMLElement>("[data-rich-text-field]") ?? null;
    const target = field ?? entry ?? row;

    target?.scrollIntoView?.({
      behavior: "smooth",
      block: field ? "center" : "start",
    });

    if (!field) {
      return;
    }

    field.setAttribute("data-trim-focus", "true");
    const editorInput = field.querySelector<HTMLElement>(".tiptap");
    (editorInput ?? field).focus({ preventScroll: true });

    const timer = window.setTimeout(() => {
      field.removeAttribute("data-trim-focus");
    }, TRIM_FOCUS_MS);

    return () => {
      window.clearTimeout(timer);
      field.removeAttribute("data-trim-focus");
    };
  }, [focusSection]);

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

  function expandRow(id: string): void {
    setExpandedIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }

  function toggleRow(id: string): void {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((expanded) => expanded !== id)
        : [...current, id],
    );
  }

  function addOptionalSection(row: SectionRow): void {
    trackEvent("section_added", {
      section: SECTION_ID_SET.has(row.id)
        ? (row.id as (typeof SECTION_IDS)[number])
        : "custom",
    });
    setRevealedOptional((current) =>
      current.includes(row.id) ? current : [...current, row.id],
    );
    expandRow(row.id);
    setOptionalMenuOpen(false);
    trackEvent("section_added", "optional");
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

  function commitOrder(order: string[]): void {
    const firstPage = doc.metadata.layout.pages[0] ?? {
      fullWidth: false,
      main: [...DEFAULT_SECTION_ORDER],
      sidebar: [],
    };

    if (order.some((id, index) => id !== firstPage.main[index])) {
      trackEvent("section_reordered");
    }

    patchDoc({
      metadata: {
        layout: {
          pages: [
            { ...firstPage, main: order },
            ...doc.metadata.layout.pages.slice(1),
          ],
        },
      },
    });
  }

  /** Writes a new visible order back to the layout, preserving tucked slots. */
  function reorderVisible(
    dragId: string,
    targetId: string,
    source: "drag" | "keyboard",
  ): void {
    const visibleIds = visibleRows.map((row) => row.id);
    const nextVisible = reorderVisibleIds(visibleIds, dragId, targetId);

    if (nextVisible.every((id, index) => id === visibleIds[index])) {
      return;
    }

    commitOrder(
      mergeVisibleOrder(
        rows.map((row) => row.id),
        new Set(tuckedRows.map((row) => row.id)),
        nextVisible,
      ),
    );
    trackEvent("section_reordered", source);
  }

  function moveRow(row: SectionRow, direction: -1 | 1): void {
    const visibleIds = visibleRows.map((candidate) => candidate.id);
    const index = visibleIds.indexOf(row.id);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= visibleIds.length) {
      return;
    }

    reorderVisible(row.id, visibleIds[nextIndex], "keyboard");
  }

  function startRowDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    row: SectionRow,
  ): void {
    // Touch and pen are always primary; a right-click on desktop must not drag.
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    capturePointer(event.currentTarget, event.pointerId);
    dragRef.current = { id: row.id, pointerId: event.pointerId, overId: null };
    setDragState({ id: row.id, overId: null });
  }

  function updateRowDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const slots = visibleRows.flatMap((row) => {
      const element = document.getElementById(`section-row-${row.id}`);
      const rect = element?.getBoundingClientRect();

      return rect
        ? [{ id: row.id, top: rect.top, bottom: rect.bottom }]
        : [];
    });
    const overId = dropTargetForPointer(slots, event.clientY);

    if (overId === drag.overId) {
      return;
    }

    drag.overId = overId;
    setDragState({ id: drag.id, overId });
  }

  function finishRowDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event.currentTarget, event.pointerId);
    dragRef.current = null;
    setDragState(null);

    if (drag.overId && drag.overId !== drag.id) {
      reorderVisible(drag.id, drag.overId, "drag");
    }
  }

  function cancelRowDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    releasePointer(event.currentTarget, event.pointerId);
    dragRef.current = null;
    setDragState(null);
  }

  function handleRowKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    row: SectionRow,
  ): void {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveRow(row, -1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveRow(row, 1);
    }
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
    trackEvent("section_added", { section: "custom" });
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
    expandRow(section.id);
    trackEvent("section_added", "custom");
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
    setExpandedIds((current) => current.filter((id) => id !== row.id));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Several sections can stay open at once; keep one quiet way to tidy the
          column instead of tapping every caret individually. */}
      {openCount >= 2 ? (
        <div className="flex justify-end">
          <button
            type="button"
            data-collapse-all=""
            onClick={() => {
              setExpandedIds([]);
              onCollapseBasics?.();
            }}
            className="inline-flex min-h-9 items-center rounded px-2 text-xs font-medium text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:min-h-11"
          >
            Collapse all
          </button>
        </div>
      ) : null}
      <ul className="flex flex-col gap-2">
        {visibleRows.map((row) => {
          const isExpanded = expandedIds.includes(row.id);
          const isCustomRow = !isSectionId(row.id) && row.id !== "summary";
          const isDragging = dragState?.id === row.id;
          const isDropTarget =
            dragState !== null && !isDragging && dragState.overId === row.id;
          const bodyId = `section-body-${row.id}`;

          return (
            <li
              key={row.id}
              id={`section-row-${row.id}`}
              data-dragging={isDragging ? "true" : undefined}
              data-drop-target={isDropTarget ? "true" : undefined}
              className={`min-w-0 overflow-hidden rounded-xl border bg-background transition-colors ${
                isDragging || isDropTarget
                  ? "border-primary/40 ring-2 ring-primary/25"
                  : "border-black/10"
              } ${isDragging ? "bg-primary/[0.04]" : ""}`}
            >
              <div className="flex min-h-11 w-full items-center gap-1 px-2 sm:px-3">
                {/* The drag handle owns pointer capture and touch-action: none
                    so a one-finger drag moves the row on a phone. Arrow keys on
                    the focused handle reorder it without a pointer. */}
                <button
                  type="button"
                  data-section-action="grip"
                  aria-label={`Reorder ${row.title}`}
                  title={`Drag or use the arrow keys to reorder ${row.title}`}
                  aria-keyshortcuts="ArrowUp ArrowDown"
                  onPointerDown={(event) => startRowDrag(event, row)}
                  onPointerMove={updateRowDrag}
                  onPointerUp={finishRowDrag}
                  onPointerCancel={cancelRowDrag}
                  onLostPointerCapture={cancelRowDrag}
                  onKeyDown={(event) => handleRowKeyDown(event, row)}
                  className={`${SECTION_HEADER_ACTION_CLASS} cursor-grab touch-none active:cursor-grabbing`}
                >
                  <DotsSixVertical size={18} aria-hidden />
                </button>
                {/* Only the title toggles expansion; the grip and hide icons
                    beside it stay reachable without opening the card. */}
                <button
                  type="button"
                  data-section-toggle={row.id}
                  aria-expanded={isExpanded}
                  aria-controls={bodyId}
                  onClick={() => toggleRow(row.id)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {isExpanded ? (
                    <CaretUp size={16} aria-hidden data-chevron="up" className="shrink-0 text-primary" />
                  ) : (
                    <CaretDown size={16} aria-hidden data-chevron="down" className="shrink-0 opacity-60" />
                  )}
                  <span
                    title={row.title}
                    className="min-w-0 flex-1 truncate text-sm font-medium leading-snug"
                  >
                    {row.title}
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${
                      row.hidden
                        ? "bg-amber-100 text-amber-900"
                        : "bg-black/5 opacity-70"
                    }`}
                  >
                    {row.hidden ? "Hidden" : countLabel(row.count)}
                  </span>
                </button>
                <div
                  role="group"
                  aria-label={`${row.title} section actions`}
                  className="flex shrink-0 items-center gap-0.5"
                >
                  <button
                    type="button"
                    data-section-action="hide"
                    aria-label={
                      row.hidden ? `Show ${row.title}` : `Hide ${row.title}`
                    }
                    aria-pressed={!row.hidden}
                    title={row.hidden ? `Show ${row.title}` : `Hide ${row.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleVisibility(row);
                    }}
                    className={`${SECTION_HEADER_ACTION_CLASS} ${row.hidden ? "text-amber-700" : ""}`}
                  >
                    {row.hidden ? (
                      <EyeSlash size={18} aria-hidden />
                    ) : (
                      <Eye size={18} aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div
                  id={bodyId}
                  className="flex min-w-0 flex-col gap-3 border-t border-black/10 px-4 py-3"
                >
                  {/* Custom section titles are edited inside CustomSectionForm.
                      Profiles render inline in the header contact line, so its
                      section heading has no visible effect in the resume. */}
                  {isCustomRow || row.id === "profiles" ? null : (
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
                  {/* Reorder/hide moved to the header; only the drawer trigger
                      and custom-section delete still need a labelled row. Two
                      columns keep their labels inside the 22rem column. */}
                  <div className="grid min-w-0 grid-cols-2 gap-2">
                    {onOpenSection ? (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSection({ id: row.id, title: row.title })
                        }
                        className={`${SECTION_ACTION_CLASS} col-span-2 lg:hidden`}
                      >
                        Open section editor
                      </button>
                    ) : null}
                    {isCustomRow ? (
                      confirmDeleteId === row.id ? (
                        <div className="col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2">
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
                          className="col-span-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:border-red-400 active:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
