"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLeft,
  CaretDown,
  CaretUp,
  EyeSlash,
  MagnifyingGlass,
  User,
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
import type { ResumeLintEntryTarget } from "@/lib/lint/resumeLint";
import { usePageLayout } from "@/lib/pagination/usePageLayout";
import { anonymizeResumeDoc } from "@/lib/privacy/anonymizeDoc";
import { isPrintTitleActive, resumeDocumentTitle } from "@/lib/print/printDocument";
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

/**
 * The Visual | ATS segments use the same solid navy fill as the Design panel's
 * segmented controls, so the active preview mode reads as a chosen state
 * instead of a faint grey press.
 */
function previewModeClass(isCurrent: boolean): string {
  return `h-8 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
    isCurrent ? "bg-primary text-white shadow-sm" : "text-text hover:bg-black/5"
  }`;
}

/** Tinted action pill for the inline Reset beside the page count. */
const PREVIEW_ACTION_CLASS =
  "inline-flex h-6 shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset";

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

  /**
   * A fit is only useful while the content needs it. Once the user deletes
   * enough to fit at 100%, drop the scale automatically instead of leaving a
   * needlessly shrunken page (and a stale Reset pill) behind.
   */
  useEffect(() => {
    if (layout.autoResetFit) {
      patchDoc({ metadata: { page: { fitScale: 1 } } });
    }
  }, [layout.autoResetFit, patchDoc]);

  /** One owner for Fit/Reset fit, whether it starts in the pill or Review. */
  function applyFitScale(scale: number): void {
    patchDoc({ metadata: { page: { fitScale: scale } } });
  }

  /**
   * Reset fit from either Review or the inline Reset beside the page count. The
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

  /** Shown in the Reset tooltip so the current shrink is never a mystery. */
  const appliedFitPercent = Math.round(doc.metadata.page.fitScale * 100);

  /**
   * Reveal one entry in Content: switch tabs on phones, expand its section and
   * let SectionList smooth-scroll to the card. Shared by Trim tips and the
   * jump-to-entry links in the Tidy dialog.
   */
  function revealEntry(sectionId: string, entryId: string | null): void {
    setActiveTab("content");
    setSectionFocus((current) => ({
      id: sectionId,
      entryId,
      nonce: (current?.nonce ?? 0) + 1,
    }));
  }

  /** A trim tip names the rendered bullet's section and entry. */
  function revealTrimIssue(issue: BulletIssue): void {
    if (!issue.sectionId) {
      return;
    }

    revealEntry(issue.sectionId, issue.entryId ?? null);
  }

  function revealLintEntry(target: ResumeLintEntryTarget): void {
    revealEntry(target.sectionId, target.entryId);
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
   * While `printResume` owns the title, the sync effect stays out of its way so
   * a re-render cannot overwrite the filename mid-spool.
   */
  useEffect(() => {
    if (status !== "ready" || isPrintTitleActive()) {
      return;
    }

    document.title = resumeDocumentTitle(previewDoc.basics.name);

    return () => {
      if (!isPrintTitleActive()) {
        document.title = "Resume Maker";
      }
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
   * `subtle-scroll` keeps each column's own scrollbar thin and low-contrast so
   * Windows Chrome/Edge do not frame every panel in a chunky gray rail.
   */
  function panelClass(
    tab: EditorTab,
    orderClass: string,
    { display = "block" }: { display?: "block" | "flex" } = {},
  ): string {
    const visibility = activeTab === tab ? display : "hidden";

    return `${visibility} lg:block ${orderClass} min-w-0 subtle-scroll lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain`;
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

      {/* The measure layer must live outside the mobile tabpanels: on phones
          `#panel-preview` is `display: none` while Content or Design is active,
          and a hidden tree reports a zero content width, so pagination would
          never finish and Save PDF could capture an empty page list. The layer
          itself is a fixed 0×0, aria-hidden shell, so it adds no layout. */}
      {layout.measureLayer}

      <main className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-6 lg:grid lg:grid-cols-[20.5rem_minmax(0,1fr)_18rem] lg:items-start lg:gap-5 lg:overflow-hidden lg:px-4">
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
              {/* Content, Tidy and Match JD share one nowrap row at every
                  width; the descriptive line wraps below instead of pushing
                  either compact pill onto a second row at 390px. */}
              <div
                data-content-title-row
                className="flex items-center justify-between gap-2"
              >
                <h2 className="shrink-0 font-serif text-xl font-semibold tracking-tight">
                  Content
                </h2>
                <div className="flex flex-nowrap items-center justify-end gap-1.5">
                  <ResumeLintPopover doc={doc} onJumpToEntry={revealLintEntry} />
                  <JdMatchDrawer doc={doc} compact />
                </div>
              </div>
              <p className="text-sm text-muted">
                Reorder, hide, or open a section to edit it.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <section
                aria-labelledby="basics-heading"
                className="overflow-hidden rounded-xl border border-black/10 bg-background"
              >
                <h3 id="basics-heading" className="m-0">
                  {/* Same row geometry as a section card: a 36px leading slot
                      (the drag-handle width) plus the caret, so `v Basics`
                      lines up with `v Profiles` and `v Experience`. */}
                  <div className="flex min-h-11 w-full items-center gap-1 px-2 sm:px-3">
                    <span
                      aria-hidden
                      data-basics-icon
                      className="flex min-h-9 min-w-9 shrink-0 items-center justify-center text-muted pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                    >
                      <User size={18} />
                    </span>
                    <button
                      type="button"
                      data-basics-toggle=""
                      aria-expanded={basicsOpen}
                      aria-controls="basics-body"
                      onClick={() => {
                        setBasicsOpen((open) => !open);
                      }}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                      <span className="shrink-0 whitespace-nowrap text-sm font-medium leading-snug">
                        Basics
                      </span>
                      <span className="ml-auto min-w-0 truncate text-xs font-normal text-muted">
                        {basicsSummary}
                      </span>
                    </button>
                  </div>
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
                basicsOpen={basicsOpen}
                onCollapseBasics={() => setBasicsOpen(false)}
              />
            </div>
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
          <div className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(23,40,57,0.04)]">
            {/* The Design column scrolls independently on desktop, so the
                heading stays put while the long option list moves underneath. */}
            <div className="pb-4 lg:sticky lg:top-0 lg:z-10 lg:-mx-4 lg:-mt-4 lg:rounded-t-2xl lg:bg-surface lg:px-4 lg:pb-4 lg:pt-4">
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                Design
              </h2>
            </div>
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
          <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-none">
            {/*
             * At `lg` the mode row starts at the same 16px inset as the
             * Content/Design card headings (card padding vs. this row's own
             * padding), and the tighter gap lifts Page 1 toward their top edge.
             */}
            <div
              data-preview-mode-header=""
              className="editor-chrome z-10 flex min-h-10 shrink-0 flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar border-b border-line/70 bg-background/95 px-1 backdrop-blur lg:sticky lg:top-0 lg:z-20 lg:min-h-14 lg:flex-wrap lg:items-start lg:overflow-visible lg:px-4 lg:pt-4"
            >
              {/*
               * The mode switch owns the left edge: a changing page pill or
               * Review badge can never slide `Visual | ATS` sideways when it
               * lives in its own shrink-0 group. The heading only earns space
               * on desktop, so phones get a flush-left switch.
               */}
              <div
                data-preview-mode-anchor=""
                className="flex shrink-0 items-center gap-2"
              >
                {/* The active bottom tab already names the Preview panel. */}
                <h2 className="hidden font-serif text-xl font-semibold tracking-tight lg:block">
                  Preview
                </h2>
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
                    className={previewModeClass(previewMode === "canvas")}
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
                    className={previewModeClass(previewMode === "ats")}
                  >
                    ATS
                  </button>
                </div>
              </div>
              {/*
               * Status and Review actions sit on the right, so their badges
               * can grow without nudging the mode anchor above.
               */}
              <div
                data-preview-actions=""
                className="flex shrink-0 items-center justify-end gap-2"
              >
                {/*
                 * One calm row carries the whole Preview status: quiet muted
                 * "1 page" text when the resume fits, or the page count plus a
                 * tinted "Fit 1p" action once it spills. Trim tips, Fit, and
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
                    className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted"
                  >
                    1 page
                    <button
                      type="button"
                      data-preview-reset-fit=""
                      aria-label="Reset fit"
                      title={`Reset fit (${appliedFitPercent}% → 100%)`}
                      onClick={resetFit}
                      className={PREVIEW_ACTION_CLASS}
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
                  pageCount={layout.pages.length}
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
            {scanPreview && previewMode === "canvas" ? (
              <div
                data-scan-banner=""
                className="flex shrink-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1 text-xs leading-snug text-primary"
              >
                <MagnifyingGlass
                  size={13}
                  aria-hidden
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1 truncate">
                  6s Scan: showing what pops in a quick skim
                </span>
                <button
                  type="button"
                  data-scan-turn-off=""
                  onClick={() => {
                    setScanPreview(false);
                  }}
                  className="shrink-0 rounded-full px-2 py-0.5 font-medium transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  Turn off
                </button>
              </div>
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
