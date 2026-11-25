"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLeft,
  CaretDown,
  CaretUp,
  EyeSlash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  LiveCanvasViewport,
  type LiveCanvasViewportHandle,
  type PreviewMode,
} from "@/components/preview/LiveCanvasViewport";
import { InAppBrowserNotice } from "@/components/preview/InAppBrowserNotice";
import { PageOverflowBanner } from "@/components/preview/PageOverflowBanner";
import { PrintTriggerButton } from "@/components/preview/PrintTriggerButton";
import { ExportJsonButton } from "@/components/shared/ExportJsonButton";
import type { BulletIssue, BulletLintReport } from "@/lib/lint/bulletMetrics";
import { usePageLayout } from "@/lib/pagination/usePageLayout";
import { anonymizeResumeDoc } from "@/lib/privacy/anonymizeDoc";
import { resumeDocumentTitle } from "@/lib/print/printDocument";
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
import { ResumeLintPopover } from "./ResumeLintPopover";
import { ReviewMenu } from "./ReviewMenu";
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
  "flex min-h-11 min-w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-text transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:border-line disabled:bg-surface-muted disabled:text-text/80 disabled:opacity-100 disabled:hover:border-line disabled:hover:bg-surface-muted sm:min-w-11";

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
  /**
   * Basics starts collapsed so Summary, Experience, Projects, Education, and
   * Skills are visible on first load. The form stays mounted behind a `hidden`
   * body, so its values and live-name subscription survive a toggle.
   */
  const [basicsOpen, setBasicsOpen] = useState(false);
  const [anonymizePreview, setAnonymizePreview] = useState(false);
  const [scanPreview, setScanPreview] = useState(false);
  /**
   * Trim tips and Fit/Reset live in the Review dialog now, so their inputs are
   * lifted here: the viewport reports the rendered-bullet scan and exposes both
   * reset paths through a ref. The zoom Reset floats inside the viewport itself.
   */
  const [bulletReport, setBulletReport] = useState<BulletLintReport | null>(
    null,
  );
  const canvasRef = useRef<LiveCanvasViewportHandle>(null);
  const [drawerSection, setDrawerSection] =
    useState<SectionListEntry | null>(null);
  /**
   * A one-shot request from Basics to reveal the Profiles card in the section
   * list. The nonce makes repeat taps work after the card was collapsed.
   */
  const [sectionFocus, setSectionFocus] = useState<{
    id: string;
    nonce: number;
  } | null>(null);
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

  /** One owner for Fit/Reset fit, whether it starts in the pill or Review. */
  function applyFitScale(scale: number): void {
    patchDoc({ metadata: { page: { fitScale: scale } } });
  }

  /**
   * Reset fit from either Review or the inline `1 page · Reset` pill. The
   * viewport also restores the paper scroll; the store patch is the fallback
   * when the canvas is not mounted (e.g. the ATS tab on a phone).
   */
  function resetFit(): void {
    if (canvasRef.current) {
      canvasRef.current.resetFit();
    } else {
      applyFitScale(1);
    }
  }

  /**
   * A trim tip names the rendered bullet's section and entry. Reveal the
   * Content tab on phones, expand that section, and let SectionList smooth
   * scroll to the entry card so the user can cut the stray words immediately.
   */
  function revealTrimIssue(issue: BulletIssue): void {
    const sectionId = issue.sectionId;

    if (!sectionId) {
      return;
    }

    setActiveTab("content");
    setSectionFocus((current) => ({
      id: sectionId,
      entryId: issue.entryId ?? null,
      nonce: (current?.nonce ?? 0) + 1,
    }));
  }

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

  // Review mode is session-only and display-only: the committed doc (and its
  // page measurements) stay untouched, and the anonymized clone is only handed
  // to the preview and the captured print snapshot.
  const previewDoc = useMemo(
    () => (anonymizePreview ? anonymizeResumeDoc(displayDoc) : displayDoc),
    [anonymizePreview, displayDoc],
  );

  const status: LoadStatus = !id
    ? "missing"
    : loadResult?.id === id
      ? loadResult.found
        ? "ready"
        : "notfound"
      : "loading";

  /**
   * Keep the browser tab named after the current resume. The print routine
   * briefly swaps in the slugified filename, but Android Chrome spools the PDF
   * asynchronously after `window.print()` returns, so restoring the page title
   * immediately can make the saved file fall back to a default name. The title
   * therefore stays synced while the editor is open and is restored on unmount.
   */
  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    document.title = resumeDocumentTitle(previewDoc.basics.name);

    return () => {
      document.title = "Resume Maker";
    };
  }, [previewDoc.basics.name, status]);

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
  const basicsSummary =
    (liveName ?? doc.basics.name).trim() || "Add your name";
  const undoAvailable = canUndo();
  const redoAvailable = canRedo();
  const statusLabel = saveStatusLabel(saveState, lastSavedAt);
  const isError = saveState === "error";

  /**
   * Tabs collapse to one visible panel below `lg`; at `lg` all three show.
   * The desktop shell is locked to the viewport, so every column scrolls on
   * its own instead of growing the document and producing a second scrollbar
   * at the right edge. Sticky offsets are no longer needed once the document
   * itself cannot scroll. On phones the shell is `fixed inset-0` for the same
   * reason: focusing a hidden control or re-measuring the canvas must never
   * scroll the document and slide the bottom nav into mid-screen.
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
    <div className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-background text-text lg:static lg:h-dvh">
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
            {/* Save PDF is the one primary CTA; backup/export is the quiet
                secondary menu beside it, not a competing outlined button. */}
            <div data-print-slot className="flex items-center">
              <PrintTriggerButton doc={previewDoc} pages={layout.pages} />
            </div>
            <ExportJsonButton />
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
          className={`${panelClass(
            "content",
            "lg:order-1",
          )} my-auto w-full max-w-3xl self-center [overflow-anchor:none] lg:my-0 lg:max-w-none lg:self-stretch`}
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
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <ResumeLintPopover doc={doc} />
                  <JdMatchDrawer doc={doc} compact />
                </div>
              </div>
              <p className="text-sm text-muted">
                Reorder, hide, or open a section to edit it.
              </p>
            </div>
            <section
              aria-labelledby="basics-heading"
              className="overflow-hidden rounded-xl border border-black/10 bg-background"
            >
              <h3 id="basics-heading" className="m-0">
                <button
                  type="button"
                  data-basics-toggle=""
                  aria-expanded={basicsOpen}
                  aria-controls="basics-body"
                  onClick={() => {
                    setBasicsOpen((open) => !open);
                  }}
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {basicsOpen ? (
                    <CaretUp
                      size={16}
                      aria-hidden
                      data-basics-chevron="up"
                      className="shrink-0 text-primary"
                    />
                  ) : (
                    <CaretDown
                      size={16}
                      aria-hidden
                      data-basics-chevron="down"
                      className="shrink-0 opacity-60"
                    />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Basics
                  </span>
                  <span className="ml-auto min-w-0 truncate text-xs font-normal text-muted">
                    {basicsSummary}
                  </span>
                </button>
              </h3>
              <div
                id="basics-body"
                hidden={!basicsOpen}
                className="border-t border-black/10 px-3 py-3"
              >
                <BasicsForm
                  onLiveNameChange={publishLiveName}
                  onManageProfiles={() =>
                    setSectionFocus((current) => ({
                      id: "profiles",
                      nonce: (current?.nonce ?? 0) + 1,
                    }))
                  }
                />
              </div>
            </section>
            <SectionList
              onOpenSection={setDrawerSection}
              openSectionId={drawerSection?.id ?? null}
              focusSection={sectionFocus}
            />
          </div>
        </section>

        <section
          id="panel-design"
          role="tabpanel"
          aria-labelledby="tab-design"
          className={`${panelClass(
            "design",
            "lg:order-3",
          )} my-auto w-full max-w-3xl self-center lg:my-0 lg:max-w-none lg:self-stretch`}
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
          })} min-h-0 flex-1 flex-col [scrollbar-gutter:stable]`}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-none">
            <div
              data-preview-mode-header=""
              className="editor-chrome z-10 flex min-h-10 shrink-0 flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar border-b border-line/70 bg-background/95 px-1 backdrop-blur lg:sticky lg:top-0 lg:z-20 lg:min-h-14 lg:flex-wrap lg:overflow-visible"
            >
              {/* The active bottom tab already names the Preview panel, so the
                  heading only earns its space on desktop. */}
              <h2 className="hidden font-serif text-xl font-semibold tracking-tight lg:block">
                Preview
              </h2>
              <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
                <div
                  role="group"
                  aria-label="Preview mode"
                  className="flex shrink-0 items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5"
                >
                  <button
                    type="button"
                    aria-pressed={previewMode === "canvas"}
                    onClick={() => {
                      setPreviewMode("canvas");
                    }}
                    className="h-8 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-black/5 aria-pressed:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Visual
                  </button>
                  <button
                    type="button"
                    aria-label="ATS text"
                    title="Plain text & one-click Workday copy"
                    aria-pressed={previewMode === "ats"}
                    onClick={() => {
                      setPreviewMode("ats");
                    }}
                    className="h-8 rounded-md px-2.5 text-xs font-medium transition-colors hover:bg-black/5 aria-pressed:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    ATS
                  </button>
                </div>
                {/*
                 * One calm row carries the whole Preview status: a quiet
                 * "1 page" label when the resume fits, or one compact spill
                 * pill (`2 pages · Fit`) once it does not. Trim tips, Fit, and
                 * Reset fit moved into Review, and the zoom Reset floats inside
                 * the viewport, so there is no second strip.
                 */}
                {layout.pages.length > 1 || layout.overflowPx > 0 ? (
                  <PageOverflowBanner
                    overflowPx={layout.overflowPx}
                    pageCount={layout.pages.length}
                    fitScale={layout.fitScale}
                    onFit={applyFitScale}
                  />
                ) : doc.metadata.page.fitScale < 1 ? (
                  <span
                    data-preview-page-label=""
                    className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 text-xs text-muted"
                  >
                    1 page
                    <span aria-hidden className="text-line">
                      ·
                    </span>
                    <button
                      type="button"
                      data-preview-reset-fit=""
                      aria-label="Reset fit"
                      title="Return the resume to its full size"
                      onClick={resetFit}
                      className="rounded-full px-1 py-0.5 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    >
                      Reset
                    </button>
                  </span>
                ) : (
                  <span
                    data-preview-page-label=""
                    className="shrink-0 text-xs font-medium text-muted"
                  >
                    1 page
                  </span>
                )}
                <ReviewMenu
                  scan={scanPreview}
                  anonymize={anonymizePreview}
                  onToggleScan={() => {
                    setScanPreview((enabled) => !enabled);
                  }}
                  onToggleAnonymize={() => {
                    setAnonymizePreview((enabled) => !enabled);
                  }}
                  bulletReport={bulletReport}
                  onSelectTrimIssue={revealTrimIssue}
                  fitTarget={layout.fitScale}
                  fitBlockedReason={layout.fitBlockedReason ?? null}
                  appliedFitScale={doc.metadata.page.fitScale}
                  onFit={applyFitScale}
                  onResetFit={resetFit}
                />
              </div>
            </div>
            {anonymizePreview ? (
              <p
                data-anonymize-banner=""
                role="status"
                className="flex shrink-0 items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-snug text-primary"
              >
                <EyeSlash size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span>
                  Review mode is on. Personal details are replaced in the
                  preview and PDF; your saved resume is unchanged.
                </span>
              </p>
            ) : null}
            <LiveCanvasViewport
              ref={canvasRef}
              doc={previewDoc}
              layout={layout}
              mode={previewMode}
              scanHighlight={scanPreview}
              onBulletReport={setBulletReport}
              onFit={applyFitScale}
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
