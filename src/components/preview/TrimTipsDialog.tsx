"use client";

import { X } from "@phosphor-icons/react";
import { useState } from "react";

import { CenteredModal } from "@/components/shared/CenteredModal";
import type { BulletIssue, BulletLintReport } from "@/lib/lint/bulletMetrics";
import { MAX_LISTED_ISSUES } from "@/lib/lint/bulletMetrics";

/**
 * A dismissible trim-tips sheet for bullets that waste space.
 *
 * It opens from the Review dialog instead of occupying its own toolbar row:
 * each issue names the reason in plain language ("2-word line", "4 lines") and
 * shows the bullet's opening words, so the user can find it in the editor
 * without an AI rewrite. Tapping a tip asks the editor to reveal that entry.
 * It stays session-only and read-only: trimming is the user's edit and keeps
 * normal undo history.
 */
export function TrimTipsDialog({
  report,
  titleId,
  hiddenCount,
  onClose,
  onSelectIssue,
}: {
  report: BulletLintReport;
  titleId: string;
  hiddenCount: number;
  onClose: () => void;
  /** Jump to the editor entry that owns the bullet. Omit for a read-only list. */
  onSelectIssue?: (issue: BulletIssue) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleIssues = showAll
    ? report.issues
    : report.issues.slice(0, MAX_LISTED_ISSUES);

  return (
    <CenteredModal open onClose={onClose} titleId={titleId}>
      <div data-bullet-trim-tips="">
        <div className="flex items-start justify-between gap-2">
          <h2 id={titleId} className="font-serif text-sm font-semibold">
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
        {onSelectIssue && report.issues.length > 0 ? (
          <p className="mt-1 text-[11px] leading-snug text-muted">
            Tap a tip to open that bullet in the editor.
          </p>
        ) : null}
        <ul className="mt-2 space-y-1.5">
          {visibleIssues.map((issue, index) => {
            const content = (
              <>
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
              </>
            );

            return (
              <li key={`${issue.kind}-${index}`}>
                {onSelectIssue ? (
                  <button
                    type="button"
                    title="Open this bullet in the editor"
                    onClick={() => onSelectIssue(issue)}
                    className="flex w-full items-start gap-1.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-black/5 active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:min-h-11"
                  >
                    {content}
                    <span
                      aria-hidden
                      data-trim-tip-chevron=""
                      className="ml-auto shrink-0 pl-1 text-base leading-none text-muted"
                    >
                      ›
                    </span>
                  </button>
                ) : (
                  <div className="flex items-start gap-1.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
        {hiddenCount > 0 ? (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((open) => !open)}
            className="mt-2 inline-flex min-h-9 items-center rounded-lg px-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-black/5 active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:min-h-11"
          >
            {showAll
              ? "Show fewer"
              : `Show all (${report.issues.length})`}
          </button>
        ) : null}
      </div>
    </CenteredModal>
  );
}
