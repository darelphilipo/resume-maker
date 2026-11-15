export function PageOverflowBanner({
  overflowPx,
  pageCount,
  lineHeightPx,
  fitScale = null,
  onFit,
}: {
  overflowPx: number;
  pageCount: number;
  lineHeightPx: number;
  fitScale?: number | null;
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
    </div>
  );
}
