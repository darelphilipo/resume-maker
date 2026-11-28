"use client";

import { CornersIn } from "@phosphor-icons/react";

/** Shared animation length for returning to the fit scale. */
export const RESET_ANIMATION_MS = 150;

/**
 * A single compact control for leaving a pinch-zoomed preview.
 *
 * It is props-driven (rather than reading `useControls`) so it can be rendered
 * by `LiveCanvasViewport` as a floating overlay outside `<TransformWrapper>`;
 * the viewport tracks the zoom level through `onTransform` and calls the
 * wrapper ref to reset.
 */
export function CanvasResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      aria-label="Reset preview zoom"
      onClick={onReset}
      className="pointer-events-auto flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface/95 px-2.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset pointer-coarse:min-h-11"
    >
      <CornersIn aria-hidden="true" size={14} />
      Reset
    </button>
  );
}

/**
 * Bottom-right placement for the zoom reset.
 *
 * It overlays the preview viewport instead of joining the Preview mode row, so
 * the single `Visual | ATS · Review` row never overflows or pushes Review off
 * a 390px phone. The wrapper is pointer-transparent so it cannot swallow canvas
 * gestures; only the pill itself takes taps.
 */
export function CanvasResetOverlay({
  visible,
  onReset,
}: {
  visible: boolean;
  onReset: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div
      data-canvas-reset=""
      className="pointer-events-none absolute bottom-3 right-3 z-20 lg:hidden"
    >
      <CanvasResetButton onReset={onReset} />
    </div>
  );
}
