"use client";

import { CornersIn } from "@phosphor-icons/react";

/** Shared animation length for returning to the fit scale. */
export const RESET_ANIMATION_MS = 150;

/**
 * A single compact control for leaving a pinch-zoomed preview.
 *
 * It is props-driven (rather than reading `useControls`) so it can live in the
 * sticky toolbar *above* `<TransformWrapper>`; `LiveCanvasViewport` tracks the
 * zoom level through `onTransform` and calls the wrapper ref to reset.
 */
export function CanvasResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      aria-label="Reset preview zoom"
      onClick={onReset}
      className="pointer-events-auto flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface/95 px-2.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      <CornersIn aria-hidden="true" size={14} />
      Reset
    </button>
  );
}
