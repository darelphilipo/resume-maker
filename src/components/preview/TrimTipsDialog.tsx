"use client";

import { X } from "@phosphor-icons/react";

import { CenteredModal } from "@/components/shared/CenteredModal";
import type { BulletLintReport } from "@/lib/lint/bulletMetrics";
import { MAX_LISTED_ISSUES } from "@/lib/lint/bulletMetrics";

/**
 * A dismissible trim-tips sheet for bullets that waste space.
 *
 * It opens from the Review dialog instead of occupying its own toolbar row:
 * each issue names the reason in plain language ("2-word line", "4 lines") and
 * shows the bullet's opening words, so the user can find it in the editor
 * without an AI rewrite. It stays session-only and read-only: trimming is the
 * user's edit and keeps normal undo history.
 */
export function TrimTipsDialog({
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
    <CenteredModal open onClose={onClose} titleId={titleId}>
      <div data-bullet-trim-tips="">
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
    </CenteredModal>
  );
}
