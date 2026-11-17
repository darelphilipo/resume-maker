"use client";

import { CornersIn } from "@phosphor-icons/react";
import { useControls, useTransformComponent } from "react-zoom-pan-pinch";

/** Shared animation length for returning to the fit scale. */
export const RESET_ANIMATION_MS = 150;

const SCALE_EPSILON = 0.001;

/**
 * A single floating control instead of a zoom/pan toolbar.
 *
 * It only exists while the preview is zoomed, so a freshly opened resume shows
 * no chrome over the page. `useControls().state` is mutated in place, so the
 * visibility comes through the library's change subscription rather than a
 * render-time read of `state.scale` (see CONTEXT Decisions #26).
 */
export function CanvasResetButton({ fitScale }: { fitScale: number }) {
  const { setTransform } = useControls();
  const isZoomed = useTransformComponent(
    ({ state }) => Math.abs(state.scale - fitScale) > SCALE_EPSILON,
  );

  if (!isZoomed) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Reset preview zoom"
      onClick={() => {
        void setTransform(0, 0, fitScale, RESET_ANIMATION_MS);
      }}
      className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface/95 px-3 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:h-8 sm:px-2.5"
    >
      <CornersIn aria-hidden="true" size={14} />
      Reset
    </button>
  );
}
