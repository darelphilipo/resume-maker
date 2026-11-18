import { MIN_FIT_SCALE } from "@/lib/pagination/fitScale";
import type { FitBlockedReason } from "@/lib/pagination/usePageLayout";

const BLOCKED_COPY: Record<FitBlockedReason, string> = {
  "page-break":
    "A section is set to start on a new page, so this can't fit on one page.",
  "too-tall": `Too tall to fit on one page above ${Math.round(
    MIN_FIT_SCALE * 100,
  )}% — trim a line or two.`,
};

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
