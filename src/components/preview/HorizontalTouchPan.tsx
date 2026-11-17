"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useControls } from "react-zoom-pan-pinch";

import {
  isPreviewZoomed,
  resolveTouchPanAxis,
  type TouchPanAxis,
} from "@/lib/zoom/canvasGestures";

/**
 * One-finger horizontal panning for a zoomed preview on touch screens.
 *
 * The library's `panning` stays disabled on coarse pointers so a one-finger
 * swipe keeps scrolling the page (see CONTEXT Decisions #3 and #26). Once the
 * user zooms in with two fingers, however, the page overflows horizontally and
 * there is no way to reach its edges. This listener fills that gap: it locks a
 * horizontal drag and moves the canvas with `panBy`, while vertical drags are
 * left completely alone so the browser scrolls the editor.
 *
 * Listeners are attached to the preview pane (outside the transform wrapper)
 * because the library calls `stopPropagation()` on touch moves it handles.
 * `touchmove` must be non-passive so a horizontal drag can call
 * `preventDefault()`; vertical moves never do, which is what preserves scroll.
 */
export function HorizontalTouchPan({
  hostRef,
  fitScale,
  enabled,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  fitScale: number;
  enabled: boolean;
}) {
  const { panBy, state } = useControls();
  const panByRef = useRef(panBy);
  const stateRef = useRef(state);

  useEffect(() => {
    panByRef.current = panBy;
    stateRef.current = state;
  }, [panBy, state]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host || !enabled) {
      return;
    }

    let active = false;
    let axis: TouchPanAxis | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;

    const begin = (touch: Touch): void => {
      active = true;
      axis = null;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
    };

    const handleTouchStart = (event: TouchEvent): void => {
      // Two fingers are the pinch gesture, handled by the library.
      if (event.touches.length !== 1) {
        active = false;
        axis = null;
        return;
      }

      begin(event.touches[0]);
    };

    const handleTouchMove = (event: TouchEvent): void => {
      if (!active || event.touches.length !== 1) {
        return;
      }

      if (!isPreviewZoomed(stateRef.current.scale, fitScale)) {
        return;
      }

      const touch = event.touches[0];

      if (axis === null) {
        axis = resolveTouchPanAxis(
          touch.clientX - startX,
          touch.clientY - startY,
        );

        if (axis === null) {
          return;
        }

        if (axis === "vertical") {
          // Stop tracking so the page scroller owns the rest of the gesture.
          active = false;
          return;
        }
      }

      const deltaX = touch.clientX - lastX;

      lastX = touch.clientX;

      if (event.cancelable) {
        event.preventDefault();
      }

      if (deltaX !== 0) {
        void panByRef.current(deltaX, 0, 0);
      }
    };

    const handleTouchEnd = (event: TouchEvent): void => {
      // Lifting one finger of a pinch leaves a one-finger drag behind; anchor
      // it at its current position so panning does not jump.
      if (event.touches.length === 1) {
        begin(event.touches[0]);
        return;
      }

      active = false;
      axis = null;
    };

    host.addEventListener("touchstart", handleTouchStart, { passive: true });
    host.addEventListener("touchmove", handleTouchMove, { passive: false });
    host.addEventListener("touchend", handleTouchEnd, { passive: true });
    host.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      host.removeEventListener("touchstart", handleTouchStart);
      host.removeEventListener("touchmove", handleTouchMove);
      host.removeEventListener("touchend", handleTouchEnd);
      host.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [enabled, fitScale, hostRef]);

  return null;
}
