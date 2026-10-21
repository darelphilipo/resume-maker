export function PageOverflowBanner({
  overflowPx,
  pageCount,
  lineHeightPx,
}: {
  overflowPx: number;
  pageCount: number;
  lineHeightPx: number;
}) {
  if (overflowPx <= 0) {
    return null;
  }

  const lines = Math.max(
    1,
    Math.ceil(overflowPx / Math.max(lineHeightPx, 1)),
  );

  return (
    <div
      role="status"
      className="page-overflow-warning flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <span>
        Runs onto page {pageCount} by ~{lines} lines
      </span>
      <button
        type="button"
        disabled
        className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 opacity-60"
      >
        Fit to 1 Page
      </button>
      <span className="text-xs opacity-60">coming soon</span>
    </div>
  );
}
