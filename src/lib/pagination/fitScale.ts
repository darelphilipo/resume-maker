export const MIN_FIT_SCALE = 0.5;

// Leave a little headroom so sub-pixel rounding does not leave one stray line
// on the next page after a fit.
const FIT_HEADROOM = 0.98;

export function computeFitScale({
  totalHeightPx,
  contentHeightPx,
  currentFitScale = 1,
}: {
  totalHeightPx: number;
  contentHeightPx: number;
  currentFitScale?: number;
}): number | null {
  if (
    !Number.isFinite(totalHeightPx) ||
    !Number.isFinite(contentHeightPx) ||
    totalHeightPx <= contentHeightPx ||
    contentHeightPx <= 0 ||
    currentFitScale <= MIN_FIT_SCALE
  ) {
    return null;
  }

  const needed =
    (contentHeightPx / totalHeightPx) * currentFitScale * FIT_HEADROOM;
  const target = Math.floor(needed * 1000) / 1000;

  if (target < MIN_FIT_SCALE || target >= currentFitScale - 0.001) {
    return null;
  }

  return target;
}
