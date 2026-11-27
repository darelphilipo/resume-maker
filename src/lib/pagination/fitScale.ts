/**
 * Smallest scale "Fit to 1 Page" is allowed to apply.
 *
 * Below roughly 78% the printed body text stops being readable on a phone, so
 * the preview explains that the resume is too tall instead of silently
 * shrinking it into microscopic type.
 */
export const MIN_FIT_SCALE = 0.78;

/**
 * Smallest body text a fitted resume may print, in points.
 *
 * A template with a smaller base font (or an imported document with a small
 * `typography.body.fontSize`) therefore gets a higher minimum scale: an 11pt
 * resume may shrink to 78%, but a 9pt one may only reach ~89% so it never
 * prints below 8pt. See `computeMinimumFitScale`.
 */
export const MIN_FIT_BODY_FONT_PT = 8;

/**
 * Floor for the vertical page margin while a fit is applied, in points.
 *
 * Reclaiming margin buys a few lines of room, but the top and bottom of the
 * paper still need to read as margins. The floor never *adds* margin to a
 * document configured below it (`computeFitMarginY` only shrinks).
 */
export const MIN_FIT_MARGIN_Y_PT = 32;

// Leave a little headroom so sub-pixel rounding does not leave one stray line
// on the next page after a fit.
const FIT_HEADROOM = 0.98;

/**
 * How strongly the fit curve follows the raw height ratio.
 *
 * A linear `contentHeight / totalHeight` ratio over-shrinks prose-heavy
 * resumes: line-height rounding and re-wrapping mean the new height is usually
 * a little shorter than the ratio predicts, which leaves a visible blank gap at
 * the bottom of Page 1. Raising the ratio to this exponent damps the shrink, so
 * the first fit stays larger and fuller. A resume that still spills can be fit
 * again (the next click moves it further).
 */
const FIT_HEIGHT_EXPONENT = 0.72;

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

/**
 * The readable floor for a document's body font.
 *
 * `MIN_FIT_SCALE` is the general 78% floor; a small base font raises it so the
 * fitted body never drops below `MIN_FIT_BODY_FONT_PT`. A missing or unusable
 * font size falls back to the general floor.
 */
export function computeMinimumFitScale(bodyFontSize?: number): number {
  if (
    typeof bodyFontSize !== "number" ||
    !Number.isFinite(bodyFontSize) ||
    bodyFontSize <= 0
  ) {
    return MIN_FIT_SCALE;
  }

  return Math.max(MIN_FIT_SCALE, MIN_FIT_BODY_FONT_PT / bodyFontSize);
}

/**
 * Vertical page margin to use while a fit is applied.
 *
 * Below 100% the margin scales with the rest of the page so the printed page
 * keeps the preview's proportions and the reclaimed space is available to the
 * content. The `MIN_FIT_MARGIN_Y_PT` floor is applied without ever inflating a
 * document that already uses a smaller margin.
 */
export function computeFitMarginY(
  marginYpt: number,
  fitScale: number,
  minMarginYpt = MIN_FIT_MARGIN_Y_PT,
): number {
  if (
    !Number.isFinite(marginYpt) ||
    marginYpt <= 0 ||
    !Number.isFinite(fitScale) ||
    fitScale >= 1
  ) {
    return marginYpt;
  }

  const scaled = marginYpt * Math.max(0, fitScale);
  const floored = Math.max(scaled, minMarginYpt);

  return Number(Math.min(marginYpt, floored).toFixed(2));
}

export function computeFitScale({
  totalHeightPx,
  contentHeightPx,
  currentFitScale = 1,
  bodyFontSize,
}: {
  totalHeightPx: number;
  contentHeightPx: number;
  currentFitScale?: number;
  /** Base body font size in points; raises the floor so text stays >= 8pt. */
  bodyFontSize?: number;
}): number | null {
  const minimumScale = computeMinimumFitScale(bodyFontSize);

  if (
    !Number.isFinite(totalHeightPx) ||
    !Number.isFinite(contentHeightPx) ||
    !Number.isFinite(currentFitScale) ||
    totalHeightPx <= contentHeightPx ||
    contentHeightPx <= 0 ||
    currentFitScale <= minimumScale
  ) {
    return null;
  }

  const needed =
    Math.pow(contentHeightPx / totalHeightPx, FIT_HEIGHT_EXPONENT) *
    currentFitScale *
    FIT_HEADROOM;
  const target = Math.floor(needed * 1000) / 1000;

  if (target < minimumScale || target >= currentFitScale - 0.001) {
    return null;
  }

  return target;
}

/**
 * Whether an applied fit can be dropped because the edited resume now fits at
 * full size.
 *
 * The measured heights already include the current fit scale (font size and
 * gaps), so dividing the total by `currentFitScale` estimates the same stack at
 * 100%. `contentHeightPx` must be the **unscaled** content box (the caller
 * passes the height for the document's configured margin, not the reclaimed
 * fit margin). A zero total means nothing has been measured yet, so it never
 * triggers a reset.
 */
export function shouldResetFitScale({
  totalHeightPx,
  contentHeightPx,
  currentFitScale = 1,
}: {
  totalHeightPx: number;
  contentHeightPx: number;
  currentFitScale?: number;
}): boolean {
  if (
    !Number.isFinite(totalHeightPx) ||
    !Number.isFinite(contentHeightPx) ||
    !Number.isFinite(currentFitScale) ||
    currentFitScale >= 1 ||
    currentFitScale <= 0 ||
    totalHeightPx <= 0 ||
    contentHeightPx <= 0
  ) {
    return false;
  }

  return totalHeightPx / currentFitScale <= contentHeightPx;
}
