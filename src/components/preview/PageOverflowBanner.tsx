"use client";

import { useState } from "react";

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

/**
 * A subtle, collapsible list of bullets that waste space.
 *
 * Each issue names the reason in plain language ("2-word line", "4 lines") and
 * shows the bullet's opening words, so the user can find it in the editor
 * without an AI rewrite. It stays session-only and read-only: trimming is the
 * user's edit and keeps normal undo history.
 */
export function BulletTrimTips({
  report,
  defaultOpen = false,
}: {
  report?: BulletLintReport | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!report || report.issues.length === 0) {
    return null;
  }

  const hiddenCount = Math.max(0, report.issues.length - MAX_LISTED_ISSUES);

  return (
    <details
      data-bullet-trim-tips=""
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
      className="max-w-full rounded-lg border border-line/70 bg-surface/95 text-text shadow-sm"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-primary marker:content-none [&::-webkit-details-marker]:hidden sm:min-h-8">
        Trim tips ({report.issues.length})
      </summary>
      <div className="border-t border-line/70 px-2.5 py-2">
        {report.summary ? (
          <p className="mb-2 text-[11px] leading-snug text-muted">
            {report.summary}
          </p>
        ) : null}
        <ul className="space-y-1.5">
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
    </details>
  );
}

export function PageOverflowBanner({
  overflowPx,
  pageCount,
  lineHeightPx,
  fitScale = null,
  fitBlockedReason = null,
  bulletReport = null,
  onFit,
}: {
  overflowPx: number;
  pageCount: number;
  lineHeightPx: number;
  fitScale?: number | null;
  fitBlockedReason?: FitBlockedReason | null;
  /** Rendered-bullet hints, scanned from the live preview DOM. */
  bulletReport?: BulletLintReport | null;
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
      className="page-overflow-warning flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      {pageCount > 1 ? (
        <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-xs font-semibold">
          Spills onto {pageCount} pages
        </span>
      ) : null}
      {overflowPx > 0 ? (
        <span>
          Runs onto page {pageCount} by ~{lines} lines
        </span>
      ) : null}
      {pageCount > 1 && bulletReport?.summary ? (
        <span
          data-bullet-trim-summary=""
          className="w-full text-xs font-medium text-amber-800 sm:w-auto"
        >
          {bulletReport.summary}
        </span>
      ) : null}
      {blockedCopy ? (
        <span className="text-xs font-medium">{BLOCKED_COPY[blockedCopy]}</span>
      ) : (
        <button
          type="button"
          disabled={!canFit}
          onClick={() => {
            if (fitScale !== null && onFit) {
              onFit(fitScale);
            }
          }}
          className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 disabled:hover:bg-white"
        >
          Fit to 1 Page
        </button>
      )}
    </div>
  );
}
