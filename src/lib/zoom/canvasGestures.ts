/** Pinch sensitivity, matching the library's own default step. */
export const CANVAS_PINCH_STEP = 5;

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
 * two-finger pinch itself.
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
