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
 */
export function useFitTransform(fitScale: number, offsetX = 0): void {
  const { setTransform } = useControls();
  const appliedFit = useRef<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(fitScale) || !Number.isFinite(offsetX)) {
      return;
    }

    const nextFit = `${fitScale}:${offsetX}`;

    if (appliedFit.current === nextFit) {
      return;
    }

    appliedFit.current = nextFit;
    void setTransform(offsetX, 0, fitScale, 0);
  }, [fitScale, offsetX, setTransform]);
}
