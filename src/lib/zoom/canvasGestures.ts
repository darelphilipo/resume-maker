/** Pinch sensitivity, matching the library's own default step. */
export const CANVAS_PINCH_STEP = 5;

/** Smallest scale change that counts as a real zoom level. */
export const PREVIEW_ZOOM_EPSILON = 0.001;

/** Finger travel before a touch gesture commits to one axis. */
export const TOUCH_AXIS_SLOP_PX = 8;

export type TouchPanAxis = "horizontal" | "vertical";

export type CanvasGestureConfig = {
  pinch: { step: number; disabled: boolean };
  panning: { disabled: boolean };
  touchAction: "auto" | "pan-y";
};

/**
 * Preview gestures differ by pointer type but pinch is always available.
 *
 * Two fingers are an explicit zoom gesture, so it does not compete with the
 * page scroller. A single touch must stay native scroll: leaving `panning`
 * enabled on coarse pointers would make the library call `preventDefault()` and
 * swallow the swipe (see CONTEXT Decisions #3 and #26). `touch-action: pan-y`
 * then lets the browser keep vertical scrolling while the library handles the
 * two-finger pinch itself. Horizontal dragging is added back only after a zoom,
 * by `HorizontalTouchPan`, which axis-locks the gesture instead of handing
 * one-finger panning to the library.
 */
export function canvasGestureConfig(
  isCoarsePointer: boolean,
): CanvasGestureConfig {
  return {
    pinch: { step: CANVAS_PINCH_STEP, disabled: false },
    panning: { disabled: isCoarsePointer },
    touchAction: isCoarsePointer ? "pan-y" : "auto",
  };
}

/**
 * True when the preview is zoomed in past its fitted width, i.e. when there is
 * horizontal overflow to explore. Zooming out below the fit scale leaves the
 * page narrower than the pane, so panning is pointless.
 */
export function isPreviewZoomed(scale: number, fitScale: number): boolean {
  return (
    Number.isFinite(scale) &&
    Number.isFinite(fitScale) &&
    scale > fitScale + PREVIEW_ZOOM_EPSILON
  );
}

/**
 * Decides which axis a one-finger touch is travelling along.
 *
 * Returning `null` keeps the gesture uncommitted (and the page scroller in
 * charge) until the finger has moved past the slop threshold. Ties and
 * vertical-first movement return `"vertical"` so page scrolling always wins
 * over panning when the direction is ambiguous.
 */
export function resolveTouchPanAxis(
  deltaX: number,
  deltaY: number,
  slopPx: number = TOUCH_AXIS_SLOP_PX,
): TouchPanAxis | null {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    return null;
  }

  const distanceX = Math.abs(deltaX);
  const distanceY = Math.abs(deltaY);

  if (distanceX <= slopPx && distanceY <= slopPx) {
    return null;
  }

  return distanceX > distanceY ? "horizontal" : "vertical";
}
