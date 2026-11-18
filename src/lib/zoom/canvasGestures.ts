/** Pinch sensitivity, matching the library's own default step. */
export const CANVAS_PINCH_STEP = 5;

/** Smallest scale change that counts as a real zoom level. */
export const PREVIEW_ZOOM_EPSILON = 0.001;

/** Finger travel before a touch gesture commits to panning. */
export const TOUCH_AXIS_SLOP_PX = 8;

export type CanvasGestureConfig = {
  pinch: { step: number; disabled: boolean };
  panning: { disabled: boolean };
};

/**
 * Preview gestures differ by pointer type but pinch is always available.
 *
 * Two fingers are an explicit zoom gesture, so it does not compete with the
 * page scroller. A single touch must stay native scroll while the page is at
 * its fitted size: leaving `panning` enabled on coarse pointers would make the
 * library call `preventDefault()` and swallow the swipe (see CONTEXT Decisions
 * #3 and #26). Once the preview is zoomed, `TouchPanCanvas` takes over
 * one-finger drags in both axes and `canvasTouchAction` locks the canvas out of
 * native scrolling for the duration of the zoom.
 */
export function canvasGestureConfig(
  isCoarsePointer: boolean,
): CanvasGestureConfig {
  return {
    pinch: { step: CANVAS_PINCH_STEP, disabled: false },
    panning: { disabled: isCoarsePointer },
  };
}

/**
 * CSS `touch-action` for the transform wrapper.
 *
 * At the fit scale, `pan-y` keeps one-finger swipes scrolling the editor.
 * While zoomed, the page is clipped inside a fixed-height canvas and can only
 * be explored by panning, so `none` stops the browser from beginning a vertical
 * page scroll before `TouchPanCanvas` can claim the gesture. Fine pointers use
 * the browser default; the library's mouse panning is unaffected.
 */
export function canvasTouchAction(
  isCoarsePointer: boolean,
  isZoomed: boolean,
): "auto" | "pan-y" | "none" {
  if (!isCoarsePointer) {
    return "auto";
  }

  return isZoomed ? "none" : "pan-y";
}

/**
 * True when the preview is zoomed in past its fitted width, i.e. when the page
 * overflows the canvas and can be panned. Zooming out below the fit scale
 * leaves the page narrower than the pane, so panning is pointless.
 */
export function isPreviewZoomed(scale: number, fitScale: number): boolean {
  return (
    Number.isFinite(scale) &&
    Number.isFinite(fitScale) &&
    scale > fitScale + PREVIEW_ZOOM_EPSILON
  );
}

export type CanvasVerticalBounds = {
  minPositionY: number;
  maxPositionY: number;
};

export type VerticalPanHandoff = {
  /** Vertical movement the zoomed canvas can still absorb. */
  pan: number;
  /** Leftover movement for the page scroller, as a `scrollTop` delta. */
  scroll: number;
};

/**
 * Splits a vertical drag between the zoomed canvas and the page scroller.
 *
 * While zoomed, the resume is clipped inside a fixed-height canvas, so
 * `TouchPanCanvas` pans it instead of letting the page scroll. That is correct
 * for exploring the page, but a multi-page resume can leave the preview toolbar
 * (and its Reset button) scrolled off-screen with no way back: native scrolling
 * is locked out by `touch-action: none`. Once the canvas reaches its top or
 * bottom bound the drag has nowhere left to go inside it, so the leftover delta
 * is returned as a `scrollTop` delta for the page scroller. Dragging down at the
 * canvas top gives a negative delta, i.e. scrolling the editor back up.
 */
export function resolveVerticalPanHandoff(
  positionY: number,
  deltaY: number,
  bounds: CanvasVerticalBounds | null | undefined,
): VerticalPanHandoff {
  if (
    !bounds ||
    !Number.isFinite(positionY) ||
    !Number.isFinite(deltaY) ||
    !Number.isFinite(bounds.minPositionY) ||
    !Number.isFinite(bounds.maxPositionY)
  ) {
    return { pan: deltaY, scroll: 0 };
  }

  const target = positionY + deltaY;
  const clamped = Math.min(
    Math.max(target, bounds.minPositionY),
    bounds.maxPositionY,
  );
  const pan = clamped - positionY;

  return { pan, scroll: pan - deltaY };
}

/** Moves at a pan bound before page scrolling reaches full speed. */
export const HANDOFF_RAMP_MOVES = 4;

export type DampedScroll = {
  /** Leftover delta eased into the page scroller for this move. */
  scroll: number;
  /** Number of consecutive at-bound moves, used for the next ease-in. */
  moves: number;
};

/**
 * Eases the page-scroller half of a pan-to-scroll handoff in over a few moves.
 *
 * The old hand-off handed the entire leftover delta to `scrollTop` on the very
 * first move past a pan bound, so a fast drag snapped the editor instead of
 * handing off smoothly. Ramping from zero keeps the canvas-to-page transition
 * continuous; a drag that resumes panning (no leftover) resets the ramp so the
 * next crossing eases in again.
 */
export function dampHandoffScroll(
  scroll: number,
  moves: number,
): DampedScroll {
  if (!Number.isFinite(scroll) || scroll === 0) {
    return { scroll: 0, moves: 0 };
  }

  const nextMoves = (Number.isFinite(moves) ? Math.max(0, moves) : 0) + 1;
  const ratio = Math.min(1, nextMoves / HANDOFF_RAMP_MOVES);

  return { scroll: scroll * ratio, moves: nextMoves };
}

/**
 * True once a touch has travelled far enough to be a drag instead of a tap.
 *
 * Both axes are considered so a drag in any direction starts panning; the
 * first few pixels stay uncommitted so a tap on the page never nudges the
 * canvas.
 */
export function hasClearedTouchSlop(
  deltaX: number,
  deltaY: number,
  slopPx: number = TOUCH_AXIS_SLOP_PX,
): boolean {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) {
    return false;
  }

  return Math.abs(deltaX) > slopPx || Math.abs(deltaY) > slopPx;
}
