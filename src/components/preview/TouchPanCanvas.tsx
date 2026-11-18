"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useControls } from "react-zoom-pan-pinch";

import {
  dampHandoffScroll,
  hasClearedTouchSlop,
  isPreviewZoomed,
  resolveVerticalPanHandoff,
} from "@/lib/zoom/canvasGestures";
import { scrollPageBy } from "@/lib/zoom/touchScroll";

/**
 * One-finger free panning for a zoomed preview on touch screens.
 *
 * The library's `panning` stays disabled on coarse pointers so one-finger
 * swipes keep scrolling the page while the resume is fitted to the width (see
 * CONTEXT Decisions #3 and #26). Once the user pinches in, the page is clipped
 * inside a fixed-height canvas: horizontal *and* vertical drags must move the
 * canvas so every part of the resume is reachable, and the page scroller must
 * not steal the vertical half of the gesture. `canvasTouchAction` locks native
 * scrolling out (`touch-action: none`) for that zoomed state.
 *
 * That lock also strands the toolbar above a long, multi-page canvas. When a
 * vertical drag reaches the canvas top or bottom bound, the leftover delta is
 * handed to the nearest page scroller (`resolveVerticalPanHandoff`), so the
 * editor can still be scrolled back up to Reset and Save PDF without zooming
 * out first.
 *
 * Listeners are attached to the preview pane (outside the transform wrapper)
 * because the library calls `stopPropagation()` on touch moves it handles.
 * `touchmove` must be non-passive so a drag can call `preventDefault()`.
 */
export function TouchPanCanvas({
  hostRef,
  fitScale,
  enabled,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  fitScale: number;
  enabled: boolean;
}) {
  const { panBy, instance, state } = useControls();
  const panByRef = useRef(panBy);
  const stateRef = useRef(state);
  const instanceRef = useRef(instance);

  useEffect(() => {
    panByRef.current = panBy;
    stateRef.current = state;
    instanceRef.current = instance;
  }, [panBy, state, instance]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host || !enabled) {
      return;
    }

    let active = false;
    let committed = false;
    let handoffMoves = 0;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    const begin = (touch: Touch): void => {
      active = true;
      committed = false;
      handoffMoves = 0;
      startX = touch.clientX;
      startY = touch.clientY;
      lastX = touch.clientX;
      lastY = touch.clientY;
    };

    const handleTouchStart = (event: TouchEvent): void => {
      // Two fingers are the pinch gesture, handled by the library.
      if (event.touches.length !== 1) {
        active = false;
        committed = false;
        handoffMoves = 0;
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

      if (!committed) {
        if (
          !hasClearedTouchSlop(
            touch.clientX - startX,
            touch.clientY - startY,
          )
        ) {
          return;
        }

        committed = true;
      }

      const deltaX = touch.clientX - lastX;
      const deltaY = touch.clientY - lastY;

      lastX = touch.clientX;
      lastY = touch.clientY;

      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const handoff = resolveVerticalPanHandoff(
        stateRef.current.positionY,
        deltaY,
        instanceRef.current.bounds,
      );

      if (deltaX !== 0 || handoff.pan !== 0) {
        void panByRef.current(deltaX, handoff.pan, 0);
      }

      // Ease the page-scroller contribution in so reaching a pan bound never
      // snaps the editor by the full remaining delta in a single move.
      const eased = dampHandoffScroll(handoff.scroll, handoffMoves);

      handoffMoves = eased.moves;

      if (eased.scroll !== 0) {
        scrollPageBy(host, eased.scroll);
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
      committed = false;
      handoffMoves = 0;
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
