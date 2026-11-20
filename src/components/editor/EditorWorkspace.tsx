"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLeft,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  LiveCanvasViewport,
  type PreviewMode,
} from "@/components/preview/LiveCanvasViewport";
import { InAppBrowserNotice } from "@/components/preview/InAppBrowserNotice";
import { PrintTriggerButton } from "@/components/preview/PrintTriggerButton";
import { ExportJsonButton } from "@/components/shared/ExportJsonButton";
import { usePageLayout } from "@/lib/pagination/usePageLayout";
import { resumeDisplayName } from "@/lib/schema/resumeName";
import {
  canRedo,
  canUndo,
  redo,
  startAutosave,
  stopAutosave,
  undo,
  useResumeStore,
  type SaveState,
} from "@/lib/store/useResumeStore";

import { BasicsForm } from "./BasicsForm";
import { DesignPanel } from "./DesignPanel";
import { EditorLoading } from "./EditorLoading";
import { EntryDrawer } from "./EntryDrawer";
import { JdMatchDrawer } from "./JdMatchDrawer";
import { SectionForm } from "./SectionForm";
import {
  MobileBottomNav,
  type EditorTab,
} from "./MobileBottomNav";
import { SectionList, type SectionListEntry } from "./SectionList";

type LoadStatus = "loading" | "ready" | "notfound" | "missing";

type LoadResult = {
  id: string;
  found: boolean;
};

function saveStatusLabel(
  saveState: SaveState,
  lastSavedAt: number | null,
): string {
  if (saveState === "saving") {
    return "Saving…";
  }

  if (saveState === "error") {
    return "Not saved — save failed";
  }

  if (lastSavedAt !== null) {
    return "Saved";
  }

  return "Not saved";
}

const HEADER_ACTION_CLASS =
  "flex min-h-11 min-w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-text transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:border-line disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 disabled:hover:border-line disabled:hover:bg-surface-muted sm:min-w-11";

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-text">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(23,40,57,0.04)]">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm opacity-70">{message}</p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to home
        </Link>
      </div>
    </main>
  );
}

export function EditorWorkspace() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const doc = useResumeStore((state) => state.doc);
  const loadResume = useResumeStore((state) => state.loadResume);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const saveState = useResumeStore((state) => state.saveState);
  const lastSavedAt = useResumeStore((state) => state.lastSavedAt);
  const [loadResult, setLoadResult] = useState<LoadResult | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("canvas");
  const [drawerSection, setDrawerSection] =
    useState<SectionListEntry | null>(null);
  /**
   * Latest Name keystroke, published before the debounced store commit. It
   * records the committed value it was based on, so once the debounce lands
   * (or undo/load replaces the doc) the override invalidates itself without an
   * effect that would cause a cascading render.
   */
  const [liveEdit, setLiveEdit] = useState<{
    name: string;
    base: string;
  } | null>(null);
  const layout = usePageLayout(doc);

  const liveName =
    liveEdit && liveEdit.base === doc.basics.name ? liveEdit.name : null;

  function publishLiveName(name: string): void {
    setLiveEdit({ name, base: doc.basics.name });
  }

  // Only the name is overridden. Pagination keeps measuring the committed doc,
  // so a keystroke never triggers a re-measure; the header and both preview
  // renderers simply read the current text.
  const displayDoc = useMemo(
    () =>
      liveName === null
        ? doc
        : { ...doc, basics: { ...doc.basics, name: liveName } },
    [doc, liveName],
  );

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    void loadResume(id)
      .then((found) => {
        if (cancelled) {
          return;
        }

        if (found) {
          startAutosave();
        }

        setLoadResult({ id, found });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadResult({ id, found: false });
        }
      });

    return () => {
      cancelled = true;
      stopAutosave();
    };
  }, [id, loadResume]);

  useEffect(() => {
    function handleUndoShortcut(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() !== "z") {
        return;
      }

      const target = event.target;

      if (target instanceof HTMLElement) {
        const tag = target.tagName;

        if (
          target.isContentEditable ||
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT"
        ) {
          return;
        }
      }

      event.preventDefault();

      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
    }

    window.addEventListener("keydown", handleUndoShortcut);

    return () => {
      window.removeEventListener("keydown", handleUndoShortcut);
    };
  }, []);

  const status: LoadStatus = !id
    ? "missing"
    : loadResult?.id === id
      ? loadResult.found
        ? "ready"
        : "notfound"
      : "loading";

  if (status === "missing") {
    return (
      <EmptyState
        title="No resume selected"
        message="Open the editor from a resume on the home page to start editing."
      />
    );
  }

  if (status === "notfound") {
    return (
      <EmptyState
        title="Resume not found"
        message="This resume may have been removed from this browser. Choose another resume or start a new one from the home page."
      />
    );
  }

  if (status === "loading") {
    return <EditorLoading />;
  }

  const resumeName = resumeDisplayName(liveName ?? doc.basics.name);
  const undoAvailable = canUndo();
  const redoAvailable = canRedo();
  const statusLabel = saveStatusLabel(saveState, lastSavedAt);
  const isError = saveState === "error";

  /**
   * Tabs collapse to one visible panel below `lg`; at `lg` all three show.
   * The desktop shell is locked to the viewport, so every column scrolls on
   * its own instead of growing the document and producing a second scrollbar
   * at the right edge. Sticky offsets are no longer needed once the document
   * itself cannot scroll.
   *
   * `display` picks the mobile display for the active state. The preview passes
   * `flex` because it owns a fixed-height column with its own scroller; using
   * one display utility (instead of layering `block`/`flex`) keeps `hidden`
   * authoritative for inactive tabs without depending on class order.
   */
  function panelClass(
    tab: EditorTab,
    orderClass: string,
    { display = "block" }: { display?: "block" | "flex" } = {},
  ): string {
    const visibility = activeTab === tab ? display : "hidden";

    return `${visibility} lg:block ${orderClass} min-w-0 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain`;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-text">
      <InAppBrowserNotice />
      <header className="editor-chrome shrink-0 sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-nowrap items-center gap-x-1.5 px-2 py-1.5 sm:gap-x-2 sm:px-6">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex min-h-11 min-w-10 shrink-0 items-center justify-center gap-2 rounded-lg px-1.5 text-sm font-medium transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-w-11 sm:px-2"
          >
            <ArrowLeft size={18} aria-hidden />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <span
            aria-hidden
            data-header-divider
            className="mx-0.5 h-7 w-px shrink-0 bg-line sm:mx-1"
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold leading-tight tracking-tight sm:text-base">
              {resumeName}
            </h1>
            <p
              aria-live="polite"
              className={`truncate text-[11px] leading-tight sm:text-xs ${
                isError ? "text-red-700" : "text-muted"
              }`}
            >
              {statusLabel}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              aria-label="Undo"
              disabled={!undoAvailable}
              onClick={undo}
              className={HEADER_ACTION_CLASS}
            >
              <ArrowCounterClockwise size={18} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Redo"
              disabled={!redoAvailable}
              onClick={redo}
              className={HEADER_ACTION_CLASS}
            >
              <ArrowClockwise size={18} aria-hidden />
            </button>
            <ExportJsonButton />
            <div data-print-slot className="flex items-center">
              <PrintTriggerButton doc={displayDoc} pages={layout.pages} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,20rem)] lg:items-start lg:gap-5 lg:overflow-hidden">
        {/* Reordering entries moves focused DOM nodes; without disabling scroll
            anchoring here the browser can shift this column's scrollTop after
            EntryActions has restored it. */}
        <section
          id="panel-content"
          role="tabpanel"
          aria-labelledby="tab-content"
          className={`${panelClass("content", "lg:order-1")} [overflow-anchor:none]`}
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(23,40,57,0.04)]">
            <div data-content-header className="flex flex-col gap-2">
              {/* Keep the title and its trigger on one row at every width; the
                  descriptive line wraps below instead of pushing Match JD to a
                  second row on phones. */}
              <div
                data-content-title-row
                className="flex items-center justify-between gap-2"
              >
                <h2 className="font-serif text-xl font-semibold tracking-tight">
                  Content
                </h2>
                <JdMatchDrawer doc={doc} compact />
              </div>
              <p className="text-sm text-muted">
                Reorder, hide, or open a section to edit it.
              </p>
            </div>
            <section aria-labelledby="basics-heading" className="flex flex-col gap-3">
              <h3
                id="basics-heading"
                className="text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Basics
              </h3>
              <BasicsForm onLiveNameChange={publishLiveName} />
            </section>
            <SectionList
              onOpenSection={setDrawerSection}
              openSectionId={drawerSection?.id ?? null}
            />
          </div>
        </section>

        <section
          id="panel-design"
          role="tabpanel"
          aria-labelledby="tab-design"
          className={panelClass("design", "lg:order-3")}
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(23,40,57,0.04)]">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Design
            </h2>
            <DesignPanel />
          </div>
        </section>

        <section
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          className={`${panelClass("preview", "lg:order-2", {
            display: "flex",
          })} min-h-0 flex-1 flex-col`}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-none">
            <div
              data-preview-mode-header=""
              className="editor-chrome z-10 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line/70 bg-background/95 px-1 backdrop-blur lg:sticky lg:top-0 lg:z-20"
            >
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                Preview
              </h2>
              <div
                role="group"
                aria-label="Preview mode"
                className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5"
              >
                <button
                  type="button"
                  aria-pressed={previewMode === "canvas"}
                  onClick={() => {
                    setPreviewMode("canvas");
                  }}
                  className="min-h-11 rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 aria-pressed:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Visual
                </button>
                <button
                  type="button"
                  aria-pressed={previewMode === "ats"}
                  onClick={() => {
                    setPreviewMode("ats");
                  }}
                  className="min-h-11 rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 aria-pressed:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  ATS text
                </button>
              </div>
            </div>
            <LiveCanvasViewport
              doc={displayDoc}
              layout={layout}
              mode={previewMode}
              onFit={(scale) => {
                patchDoc({ metadata: { page: { fitScale: scale } } });
              }}
            />
          </div>
        </section>
      </main>

      <MobileBottomNav activeTab={activeTab} onChange={setActiveTab} />

      <EntryDrawer
        open={drawerSection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDrawerSection(null);
          }
        }}
        title={drawerSection?.title ?? "Section"}
        description={
          drawerSection ? `Edit ${drawerSection.title}` : "Edit section"
        }
      >
        {drawerSection ? (
          <SectionForm sectionId={drawerSection.id} />
        ) : null}
      </EntryDrawer>
    </div>
  );
}
