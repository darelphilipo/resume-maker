/**
 * Discrete desktop zoom stops, expressed as a percentage of the fitted width.
 *
 * `+` / `-` jump between these stops rather than adding a fraction of the
 * current scale, so every click lands on a clean 25% increment and zooming
 * down from any wheel-zoomed scale snaps straight back to 100% (fit).
 */
export const ZOOM_STEP_PERCENTS = [100, 125, 150, 175, 200, 225] as const;

export type ZoomStepPercent = (typeof ZOOM_STEP_PERCENTS)[number];

export const MAX_ZOOM_STEP_PERCENT: ZoomStepPercent =
  ZOOM_STEP_PERCENTS[ZOOM_STEP_PERCENTS.length - 1];

/**
 * The next clean stop in `direction`, or `null` when the ladder is exhausted.
 *
 * A scale nudged off the ladder by the wheel is snapped in the requested
 * direction: 102% + goes to 125%, while 102% - lands exactly on 100% instead of
 * leaving a stray intermediate step behind.
 */
export function nextZoomStepPercent(
  percent: number,
  direction: 1 | -1,
): ZoomStepPercent | null {
  if (direction === 1) {
    return ZOOM_STEP_PERCENTS.find((step) => step > percent) ?? null;
  }

  const below = [...ZOOM_STEP_PERCENTS]
    .reverse()
    .find((step) => step < percent);

  // Everything already above fit still has one stop left: fit itself.
  return below ?? (percent > ZOOM_STEP_PERCENTS[0] ? ZOOM_STEP_PERCENTS[0] : null);
}
