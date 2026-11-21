/**
 * Keeps a ResizeObserver-driven preview width from oscillating.
 *
 * The canvas fit is derived from the observed width: a smaller width lowers the
 * fit scale and the page-stack height, which can remove the very scrollbar that
 * made the width smaller in the first place. The observer then reports the larger
 * width again and the canvas "dances" between two scales and X offsets forever.
 * CSS `scrollbar-gutter: stable` removes the feedback loop at the source; this
 * guard is the second line of defence for browsers or layouts where the measured
 * width still flickers between two nearby values.
 */

/** Widths at most this far apart count as the same physical layout. */
export const WIDTH_OSCILLATION_MAX_DELTA_PX = 24;
/** Alternation must happen within this window to count as feedback jitter. */
export const WIDTH_OSCILLATION_WINDOW_MS = 150;

export type WidthSample = {
  width: number;
  time: number;
};

export type StableWidthState = {
  samples: WidthSample[];
  lockedWidth: number | null;
};

export const initialStableWidthState: StableWidthState = {
  samples: [],
  lockedWidth: null,
};

/**
 * Feeds one observed width into the oscillation guard.
 *
 * An A -> B -> A (or B -> A -> B) alternation between two widths that differ by
 * at most `WIDTH_OSCILLATION_MAX_DELTA_PX`, all seen within
 * `WIDTH_OSCILLATION_WINDOW_MS`, is treated as scrollbar feedback and locks the
 * reported width to the smaller value until a genuine (larger) resize arrives.
 * A genuine resize is any width outside the jitter band of the lock, so window
 * resizes and paper-size changes still refit the canvas normally.
 */
export function stabilizeObservedWidth(
  state: StableWidthState,
  sample: WidthSample,
): { width: number; state: StableWidthState } {
  const { width, time } = sample;

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(time)) {
    const last = state.samples[state.samples.length - 1]?.width ?? 0;

    return {
      width: state.lockedWidth ?? last,
      state,
    };
  }

  const windowStart = time - WIDTH_OSCILLATION_WINDOW_MS;
  const samples = [...state.samples.filter((item) => item.time >= windowStart), sample];
  const lockedWidth = state.lockedWidth;

  if (lockedWidth !== null) {
    if (Math.abs(width - lockedWidth) > WIDTH_OSCILLATION_MAX_DELTA_PX) {
      // A real resize (not scrollbar jitter) releases the lock.
      return { width, state: { samples, lockedWidth: null } };
    }

    return { width: lockedWidth, state: { samples, lockedWidth } };
  }

  if (samples.length >= 3) {
    const [first, middle, last] = samples.slice(-3);
    const alternates = first.width === last.width && first.width !== middle.width;
    const withinBand =
      Math.abs(first.width - middle.width) <= WIDTH_OSCILLATION_MAX_DELTA_PX;
    const withinWindow = last.time - first.time <= WIDTH_OSCILLATION_WINDOW_MS;

    if (alternates && withinBand && withinWindow) {
      const smaller = Math.min(first.width, middle.width);

      return { width: smaller, state: { samples, lockedWidth: smaller } };
    }
  }

  return { width, state: { samples, lockedWidth: null } };
}
