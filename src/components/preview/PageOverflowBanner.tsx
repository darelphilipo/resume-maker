"use client";

import { MIN_FIT_LABEL, fitBlockedCopy } from "@/lib/pagination/fitCopy";
import type { FitBlockedReason } from "@/lib/pagination/usePageLayout";

/**
 * The one-line spill cue that lives in the Preview mode bar.
 *
 * A clean one-page resume keeps its quiet "1 page" label; once the resume
 * spills this pill replaces it (`2 pages · Fit`) and the compact **Fit** action
 * applies the computed scale. When no readable fit exists it shows the short
 * `Min 78%` floor instead, with the full explanation in the `title` and
 * screen-reader copy, so nothing is truncated with an ellipsis.
 */
export function PageOverflowBanner({
  overflowPx = 0,
  pageCount,
  fitScale = null,
  fitBlockedReason = null,
  onFit,
}: {
  overflowPx?: number;
  pageCount: number;
  fitScale?: number | null;
  fitBlockedReason?: FitBlockedReason | null;
  onFit?: (scale: number) => void;
}) {
  if (overflowPx <= 0 && pageCount <= 1) {
    return null;
  }

  const canFit = fitScale !== null && onFit !== undefined;
  const blockedCopy = canFit ? null : fitBlockedReason;

  return (
    <div
      role="status"
      data-page-overflow=""
      className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 text-xs text-text"
    >
      <span className="font-semibold">
        <span className="sr-only">Spills onto </span>
        {pageCount} {pageCount === 1 ? "page" : "pages"}
      </span>
      {canFit ? (
        <>
          <span aria-hidden className="text-line">
            ·
          </span>
          <button
            type="button"
            aria-label="Fit to 1 Page"
            onClick={() => {
              if (fitScale !== null && onFit) {
                onFit(fitScale);
              }
            }}
            className="rounded-full px-1 py-0.5 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            Fit
          </button>
        </>
      ) : blockedCopy ? (
        <>
          <span aria-hidden className="text-line">
            ·
          </span>
          <span className="text-muted" title={fitBlockedCopy(blockedCopy)}>
            {MIN_FIT_LABEL}
            <span className="sr-only">. {fitBlockedCopy(blockedCopy)}</span>
          </span>
        </>
      ) : null}
    </div>
  );
}
