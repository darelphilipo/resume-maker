/**
 * Wheel zoom is intentionally multiplicative: `factor = exp(-delta * intensity)`.
 * That keeps the perceived step identical at every zoom level, unlike the
 * library's additive `scale + delta * step`.
 *
 * One conventional mouse notch is `deltaY = -100` px, which gives
 * `exp(100 * 0.00088) ≈ 1.092` (about +9.2%). A ~300 px trackpad swipe gives
 * `exp(300 * 0.00088) ≈ 1.302`, i.e. about +30%.
 */
export const WHEEL_ZOOM_INTENSITY = 0.00088;

/** Rough pixel length of one text line, used for DOM_DELTA_LINE events. */
const PIXELS_PER_LINE = 16;

/** Rough pixel height of one page, used for DOM_DELTA_PAGE events. */
const PIXELS_PER_PAGE = 400;

/**
 * Upper bound on the zoom factor for a single applied step. A huge wheel burst
 * (page-mode delta, trackpad fling) must not traverse the whole zoom range in
 * one frame.
 */
const MAX_STEP_FACTOR = 1.6;

const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalizes a wheel delta to CSS pixels so mouse wheels, trackpads and
 * browsers that report lines (`deltaMode = 1`) or pages (`deltaMode = 2`)
 * produce comparable zoom steps.
 */
export function normalizeWheelDelta(
  deltaY: number,
  deltaMode: number,
): number {
  if (!Number.isFinite(deltaY)) {
    return 0;
  }

  if (deltaMode === DOM_DELTA_LINE) {
    return deltaY * PIXELS_PER_LINE;
  }

  if (deltaMode === DOM_DELTA_PAGE) {
    return deltaY * PIXELS_PER_PAGE;
  }

  // DOM_DELTA_PIXEL (0), unknown modes and non-numeric modes are pixels.
  return deltaY;
}

/**
 * Returns the scale to apply for a normalized wheel delta. The factor is
 * clamped per call, then the result is clamped to the configured zoom range.
 */
export function wheelZoomTarget(
  currentScale: number,
  deltaPx: number,
  minScale: number,
  maxScale: number,
): number {
  if (!Number.isFinite(currentScale)) {
    return clamp(minScale, minScale, maxScale);
  }

  if (!Number.isFinite(deltaPx) || deltaPx === 0) {
    return clamp(currentScale, minScale, maxScale);
  }

  const factor = clamp(
    Math.exp(-deltaPx * WHEEL_ZOOM_INTENSITY),
    1 / MAX_STEP_FACTOR,
    MAX_STEP_FACTOR,
  );

  return clamp(currentScale * factor, minScale, maxScale);
}
