/**
 * Smallest scale "Fit to 1 Page" is allowed to apply.
 *
 * Below roughly 78% the printed body text stops being readable on a phone, so
 * the preview explains that the resume is too tall instead of silently
 * shrinking it into microscopic type.
 */
export const MIN_FIT_SCALE = 0.78;

// Leave a little headroom so sub-pixel rounding does not leave one stray line
// on the next page after a fit.
const FIT_HEADROOM = 0.98;

/** Breathing room between the paper and the preview panel edges. */
export const FIT_VIEWPORT_PADDING_PX = 32;

/**
 * Extra horizontal room kept clear inside the preview. Right-aligned dates and
 * other edge-hugging text are laid out at the page's full width, so a fit that
 * uses every available pixel can clip them by a few pixels after rounding or a
 * scrollbar transition.
 */
export const FIT_SAFETY_MARGIN_PX = 12;

/**
 * The scale that makes a page fit the observed preview width.
 *
 * The paper is laid out at its real width and then scaled, so the fit budget is
 * the container minus the usual preview padding **and** a small safety margin.
 * Without the margin a right-aligned date can sit exactly on the page edge and
 * lose its last pixels.
 */
export function computeWidthFitScale({
  containerWidthPx,
  pageWidthPx,
  minScale = 0.2,
  maxScale = 1,
}: {
  containerWidthPx: number;
  pageWidthPx: number;
  minScale?: number;
  maxScale?: number;
}): number {
  const usableWidthPx = Math.max(
    0,
    containerWidthPx - FIT_VIEWPORT_PADDING_PX - FIT_SAFETY_MARGIN_PX,
  );
  const rawScale = usableWidthPx / pageWidthPx;

  if (!Number.isFinite(rawScale)) {
    return maxScale;
  }

  return Math.min(maxScale, Math.max(minScale, rawScale));
}

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
