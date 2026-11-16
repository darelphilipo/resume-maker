"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowLeft,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  LiveCanvasViewport,
  type PreviewMode,
} from "@/components/preview/LiveCanvasViewport";
import { InAppBrowserNotice } from "@/components/preview/InAppBrowserNotice";
import { PrintTriggerButton } from "@/components/preview/PrintTriggerButton";
import { ExportJsonButton } from "@/components/shared/ExportJsonButton";
import { usePageLayout } from "@/lib/pagination/usePageLayout";
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

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-text">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-black/10 p-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm opacity-70">{message}</p>
        <Link
          href="/"
          className="mt-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
  const layout = usePageLayout(doc);

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

  const resumeName = doc.basics.name.trim() || "Untitled resume";
  const undoAvailable = canUndo();
  const redoAvailable = canRedo();
  const statusLabel = saveStatusLabel(saveState, lastSavedAt);
  const isError = saveState === "error";

  function panelClass(tab: EditorTab, orderClass: string): string {
    const visibility = activeTab === tab ? "block" : "hidden";

    return `${visibility} lg:block ${orderClass} min-w-0`;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-text lg:block lg:h-auto lg:overflow-visible">
      <InAppBrowserNotice />
      <header className="editor-chrome sticky top-0 z-20 border-b border-black/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:px-6">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowLeft size={18} aria-hidden />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="min-w-0 flex-1 basis-24">
            <h1 className="truncate text-base font-semibold tracking-tight">
              {resumeName}
            </h1>
            <p
              aria-live="polite"
              className={`text-xs ${isError ? "text-red-700" : "opacity-60"}`}
            >
              {statusLabel}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1.5">
            <button
              type="button"
              aria-label="Undo"
              disabled={!undoAvailable}
              onClick={undo}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-black/10 transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:bg-transparent"
            >
              <ArrowCounterClockwise size={18} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Redo"
              disabled={!redoAvailable}
              onClick={redo}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-black/10 transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:bg-transparent"
            >
              <ArrowClockwise size={18} aria-hidden />
            </button>
            <ExportJsonButton />
            <div data-print-slot className="flex items-center">
              <PrintTriggerButton doc={doc} pages={layout.pages} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,20rem)] lg:items-start lg:gap-5 lg:overflow-visible lg:pb-8">
        <section
          id="panel-content"
          role="tabpanel"
          aria-labelledby="tab-content"
          className={panelClass("content", "lg:order-1")}
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-black/10 p-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight">Content</h2>
              <p className="text-sm opacity-70">
                Reorder, hide, or open a section to edit it.
              </p>
            </div>
            <JdMatchDrawer doc={doc} />
            <section aria-labelledby="basics-heading" className="flex flex-col gap-3">
              <h3
                id="basics-heading"
                className="text-xs font-semibold uppercase tracking-wide opacity-60"
              >
                Basics
              </h3>
              <BasicsForm />
            </section>
            <SectionList onOpenSection={setDrawerSection} />
          </div>
        </section>

        <section
          id="panel-design"
          role="tabpanel"
          aria-labelledby="tab-design"
          className={panelClass("design", "lg:order-3")}
        >
          <div className="flex flex-col gap-4 rounded-2xl border border-black/10 p-4">
            <h2 className="text-lg font-semibold tracking-tight">Design</h2>
            <DesignPanel />
          </div>
        </section>

        <section
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          className={panelClass("preview", "lg:order-2")}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-lg font-semibold tracking-tight">Preview</h2>
              <div
                role="group"
                aria-label="Preview mode"
                className="flex items-center gap-1 rounded-lg border border-black/10 p-0.5"
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
              doc={doc}
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
