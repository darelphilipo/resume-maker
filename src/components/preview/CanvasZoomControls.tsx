"use client";

import { Minus, Plus } from "@phosphor-icons/react";

/**
 * A compact floating zoom pill for pointer-first desktops.
 *
 * Pinch and Ctrl/⌘ + wheel already zoom the canvas, but a mouse-only or
 * keyboard user should not have to discover either gesture. The pill sits in
 * the bottom-right corner of the preview (never in the mode row), stays hidden
 * below `lg`, and shows the current zoom relative to the fitted width so 100%
 * means "fits the preview". Mobile keeps the pinch gesture plus the floating
 * Reset overlay unchanged.
 */
export function CanvasZoomControls({
  percent,
  zoomed,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  /** Current zoom relative to the fit scale, where 100 is fitted width. */
  percent: number;
  /** Whether the canvas is away from its fitted transform. */
  zoomed: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div
      data-canvas-zoom-controls=""
      className="pointer-events-none absolute bottom-3 right-3 z-20 hidden lg:flex"
    >
      <div
        role="group"
        aria-label="Preview zoom"
        className="pointer-events-auto flex h-8 items-center gap-0.5 rounded-full border border-line bg-surface/95 p-0.5 shadow-sm backdrop-blur-sm"
      >
        {/*
         * Reset grows the pill from its LEFT edge, because the overlay is
         * right-anchored. Keeping it ahead of `[- | % | +]` therefore leaves
         * the zoom buttons at exactly the same x-position when Reset appears
         * or disappears — a rapid second `+` tap cannot land on Reset.
         */}
        {zoomed ? (
          <button
            type="button"
            aria-label="Reset zoom to fit"
            onClick={onReset}
            className="mr-0.5 h-7 rounded-full px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            Reset
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={!canZoomOut}
          onClick={onZoomOut}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
        >
          <Minus size={14} aria-hidden />
        </button>
        <span
          data-canvas-zoom-percent=""
          aria-live="polite"
          aria-atomic="true"
          className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-text"
        >
          {percent}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={!canZoomIn}
          onClick={onZoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
        >
          <Plus size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
