"use client";

import { useEffect, useRef } from "react";
import { useControls } from "react-zoom-pan-pinch";

/**
 * Applies the fitted canvas transform exactly once per fit target.
 *
 * `react-zoom-pan-pinch` rebuilds every method returned by `useControls()` on
 * each render, so a `setTransform` effect that lists it as a dependency re-fits
 * on *every* render. `CanvasSurface` re-renders as soon as the zoomed bit flips,
 * so the first pinch frame used to call `setTransform(0, 0, fitScale, 0)` and
 * snap the canvas back to fit: the pinch appeared to reset, the
 * transform/render ping-pong caused jitter and freezes, and the aborted gesture
 * left `touch-action: none` behind so the page would not scroll until the next
 * touch.
 *
 * Re-fitting is only correct when the fitted scale genuinely changes (container
 * resize, paper size, or a new fit-to-one-page scale), so the ref guard ignores
 * the library's unstable function identity. The horizontal offset is part of the
 * fit key because a wider viewport can keep the same scale while giving the
 * narrower paper more leftover space to centre inside.
 *
 * `resetKey` covers the cases where the *fit target* is unchanged but the
 * applied transform is not trustworthy any more: switching templates, or
 * returning to a Preview tab that was `display: none` while another mobile tab
 * was open. The library measures a hidden wrapper as 0×0 and clamps its stored
 * position to 0, so without a re-apply the paper stays flush-left with a gray
 * gap on the right even though the cached fit scale/offset are still correct.
 */
export function useFitTransform(
  fitScale: number,
  offsetX = 0,
  resetKey = "",
): void {
  const { setTransform } = useControls();
  const appliedFit = useRef<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(fitScale) || !Number.isFinite(offsetX)) {
      return;
    }

    const nextFit = `${fitScale}:${offsetX}:${resetKey}`;

    if (appliedFit.current === nextFit) {
      return;
    }

    appliedFit.current = nextFit;
    void setTransform(offsetX, 0, fitScale, 0);
  }, [fitScale, offsetX, resetKey, setTransform]);
}
