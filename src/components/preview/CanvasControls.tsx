"use client";

import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Minus,
  Plus,
} from "@phosphor-icons/react";
import { useControls, useTransformComponent } from "react-zoom-pan-pinch";

/** Each click multiplies the scale, so the step feels the same at any zoom. */
export const ZOOM_STEP_FACTOR = 1.15;

/** How far one arrow-button press moves the canvas, in screen pixels. */
export const PAN_STEP_PX = 80;

/** Shared animation length for button-driven zoom and pan. */
export const CONTROL_ANIMATION_MS = 150;

const CONTROL_GROUP_CLASS =
  "flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-sm";

const CONTROL_BUTTON_CLASS =
  "flex h-11 w-9 items-center justify-center rounded-md text-sm font-medium text-primary transition-colors hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:h-8 sm:w-8";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function CanvasControls({
  fitScale,
  minScale,
  maxScale,
}: {
  fitScale: number;
  minScale: number;
  maxScale: number;
}) {
  const { centerView, panBy, setTransform, state } = useControls();

  // `useControls().state` is mutated in place by the library, so render the
  // percentage through its change subscription. React bails out when the
  // rounded value is unchanged (e.g. while panning at a fixed scale).
  const zoomPercent = useTransformComponent(({ state: current }) =>
    Math.round(current.scale * 100),
  );

  // At the fit scale the whole page is visible and bounds make panning a
  // no-op, so the arrows stay disabled until the user zooms in.
  const canPan = state.scale > fitScale + 0.001;

  const zoomTo = (scale: number): void => {
    void centerView(
      clamp(scale, minScale, maxScale),
      CONTROL_ANIMATION_MS,
      "easeOut",
    );
  };

  const pan = (deltaX: number, deltaY: number): void => {
    void panBy(deltaX, deltaY, CONTROL_ANIMATION_MS, "easeOut");
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <div role="group" aria-label="Preview zoom" className={CONTROL_GROUP_CLASS}>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => {
            zoomTo(state.scale / ZOOM_STEP_FACTOR);
          }}
          className={CONTROL_BUTTON_CLASS}
        >
          <Minus aria-hidden="true" size={16} />
        </button>
        <span className="w-11 shrink-0 text-center text-xs font-medium tabular-nums text-muted sm:w-10">
          {zoomPercent}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => {
            zoomTo(state.scale * ZOOM_STEP_FACTOR);
          }}
          className={CONTROL_BUTTON_CLASS}
        >
          <Plus aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          aria-label="Fit preview to width"
          onClick={() => {
            void setTransform(0, 0, fitScale, CONTROL_ANIMATION_MS);
          }}
          className="h-11 rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:h-8"
        >
          Fit
        </button>
      </div>
      <div
        role="group"
        aria-label="Move preview"
        className={CONTROL_GROUP_CLASS}
      >
        <button
          type="button"
          aria-label="Move preview left"
          disabled={!canPan}
          onClick={() => {
            pan(-PAN_STEP_PX, 0);
          }}
          className={CONTROL_BUTTON_CLASS}
        >
          <CaretLeft aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          aria-label="Move preview up"
          disabled={!canPan}
          onClick={() => {
            pan(0, -PAN_STEP_PX);
          }}
          className={CONTROL_BUTTON_CLASS}
        >
          <CaretUp aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          aria-label="Move preview down"
          disabled={!canPan}
          onClick={() => {
            pan(0, PAN_STEP_PX);
          }}
          className={CONTROL_BUTTON_CLASS}
        >
          <CaretDown aria-hidden="true" size={16} />
        </button>
        <button
          type="button"
          aria-label="Move preview right"
          disabled={!canPan}
          onClick={() => {
            pan(PAN_STEP_PX, 0);
          }}
          className={CONTROL_BUTTON_CLASS}
        >
          <CaretRight aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  );
}
