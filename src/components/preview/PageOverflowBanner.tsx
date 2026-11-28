"use client";

import { ArrowsIn } from "@phosphor-icons/react";

/**
 * The one-line spill cue that lives in the Preview mode bar.
 *
 * A clean one-page resume keeps its quiet "1 page" label; once the resume
 * spills, the bar shows the page count as plain muted status text plus one
 * compact **Fit 1p** action. The count stays borderless so it reads as status,
 * not a button, and the tinted action pill is short enough to keep `Review`
 * from clipping at 390px. When no readable fit exists only the count remains;
 * the plain-English reason lives in Review under the disabled `Fit to 1 page`
 * control.
 */
export function PageOverflowBanner({
  overflowPx = 0,
  pageCount,
  fitScale = null,
  onFit,
}: {
  overflowPx?: number;
  pageCount: number;
  fitScale?: number | null;
  onFit?: (scale: number) => void;
}) {
  if (overflowPx <= 0 && pageCount <= 1) {
    return null;
  }

  const canFit = fitScale !== null && onFit !== undefined;

  return (
    <div
      data-page-overflow=""
      className="flex shrink-0 items-center gap-1 whitespace-nowrap"
    >
      <span
        role="status"
        data-page-overflow-count=""
        className="text-xs text-muted"
      >
        <span className="sr-only">Spills onto </span>
        {pageCount} {pageCount === 1 ? "page" : "pages"}
      </span>
      {canFit ? (
        <button
          type="button"
          aria-label="Fit to 1 page"
          title="Shrink the resume to one readable page"
          onClick={() => {
            if (fitScale !== null && onFit) {
              onFit(fitScale);
            }
          }}
          className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset pointer-coarse:min-h-11"
        >
          <ArrowsIn size={12} aria-hidden className="shrink-0" />
          Fit 1p
        </button>
      ) : null}
    </div>
  );
}
