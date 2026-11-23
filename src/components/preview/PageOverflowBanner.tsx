"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import type { BulletLintReport } from "@/lib/lint/bulletMetrics";
import { MAX_LISTED_ISSUES } from "@/lib/lint/bulletMetrics";
import { MIN_FIT_SCALE } from "@/lib/pagination/fitScale";
import type { FitBlockedReason } from "@/lib/pagination/usePageLayout";

const BLOCKED_COPY: Record<FitBlockedReason, string> = {
  "page-break":
    "A section is set to start on a new page, so this can't fit on one page.",
  "too-tall": `Too tall to fit on one page above ${Math.round(
    MIN_FIT_SCALE * 100,
  )}% — trim a line or two.`,
};

function TrimTipsDialog({
  report,
  titleId,
  hiddenCount,
  onClose,
}: {
  report: BulletLintReport;
  titleId: string;
  hiddenCount: number;
  onClose: () => void;
}) {
  return (
    <div
      data-bullet-trim-tips=""
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-4 text-left text-text shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-sm font-semibold">
            Trim tips
          </h2>
          <button
            type="button"
            aria-label="Close trim tips"
            onClick={onClose}
            className="-mr-1 -mt-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {report.summary ? (
          <p className="mt-1 text-[11px] leading-snug text-muted">
            {report.summary}
          </p>
        ) : null}
        <ul className="mt-2 space-y-1.5">
          {report.issues.slice(0, MAX_LISTED_ISSUES).map((issue, index) => (
            <li
              key={`${issue.kind}-${index}`}
              className="flex items-start gap-1.5"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {issue.kind === "orphan"
                  ? `${issue.lastLineWords}-word line`
                  : `${issue.lineCount} ${
                      issue.lineCount === 1 ? "line" : "lines"
                    }`}
              </span>
              <span className="min-w-0 break-words text-[11px] leading-snug text-text/90">
                {issue.snippet}
              </span>
            </li>
          ))}
        </ul>
        {hiddenCount > 0 ? (
          <p className="mt-1.5 text-[11px] text-muted">+{hiddenCount} more</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A dismissible trim-tips sheet for bullets that waste space.
 *
 * It opens from a compact toolbar pill as an overlay instead of expanding
 * inline inside the preview chrome: the chrome is `shrink-0` on phones, so an
 * inline list used to eat the space the resume preview needs. Each issue names
 * the reason in plain language ("2-word line", "4 lines") and shows the
 * bullet's opening words, so the user can find it in the editor without an AI
 * rewrite. It stays session-only and read-only: trimming is the user's edit and
 * keeps normal undo history.
 */
export function BulletTrimTips({
  report,
  defaultOpen = false,
}: {
  report?: BulletLintReport | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!report || report.issues.length === 0) {
    return null;
  }

  const hiddenCount = Math.max(0, report.issues.length - MAX_LISTED_ISSUES);

  return (
    <>
      <button
        type="button"
        data-bullet-trim-trigger=""
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        onClick={() => {
          setOpen((current) => !current);
        }}
        className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-line/70 bg-surface/95 px-2.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
      >
        Trim tips ({report.issues.length})
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <TrimTipsDialog
              report={report}
              titleId={titleId}
              hiddenCount={hiddenCount}
              onClose={() => {
                setOpen(false);
              }}
            />,
            document.body,
          )
        : null}
    </>
  );
}

export function PageOverflowBanner({
  overflowPx,
  pageCount,
  lineHeightPx,
  fitScale = null,
  fitBlockedReason = null,
  onFit,
}: {
  overflowPx: number;
  pageCount: number;
  lineHeightPx: number;
  fitScale?: number | null;
  fitBlockedReason?: FitBlockedReason | null;
  onFit?: (scale: number) => void;
}) {
  if (overflowPx <= 0 && pageCount <= 1) {
    return null;
  }

  const lines = Math.max(
    1,
    Math.ceil(overflowPx / Math.max(lineHeightPx, 1)),
  );
  const canFit = fitScale !== null && onFit !== undefined;
  const blockedCopy = canFit ? null : fitBlockedReason;

  return (
    <div
      role="status"
      data-page-overflow=""
      className="flex min-w-0 flex-nowrap items-center gap-1.5 text-xs text-amber-900"
    >
      {pageCount > 1 ? (
        <span className="shrink-0 font-semibold text-text">
          <span className="sr-only">Spills onto </span>
          <span>
            {pageCount} {pageCount === 1 ? "page" : "pages"}
          </span>
        </span>
      ) : null}
      {overflowPx > 0 ? (
        <span className="shrink-0 text-muted">
          <span className="sr-only">Runs onto page {pageCount} by </span>
          <span>
            ~{lines} lines
          </span>
        </span>
      ) : null}
      {blockedCopy ? (
        <span className="min-w-0 truncate text-muted" title={BLOCKED_COPY[blockedCopy]}>
          {BLOCKED_COPY[blockedCopy]}
        </span>
      ) : (
        <button
          type="button"
          disabled={!canFit}
          onClick={() => {
            if (fitScale !== null && onFit) {
              onFit(fitScale);
            }
          }}
          className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 disabled:hover:bg-amber-50"
        >
          Fit to 1 Page
        </button>
      )}
    </div>
  );
}
