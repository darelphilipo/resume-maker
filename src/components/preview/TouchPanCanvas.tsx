"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useControls } from "react-zoom-pan-pinch";

import {
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
 * vertical drag reaches the canvas top or bottom bound, 100% of the leftover
 * delta is handed to the page scroller (`resolveVerticalPanHandoff`), so the
 * editor can still be scrolled back up to Reset and Save PDF without zooming
 * out first, and can continue from Page 1 into Page 2 and Page 3. The phone's
 * real paper scroller (`[data-canvas-scroll]`) is a *descendant* of the preview
 * pane, so it is passed in explicitly as `scrollRef`; walking ancestors would
 * miss it and leave the drag frozen at the page break.
 *
 * Listeners are attached to the preview pane (outside the transform wrapper)
 * because the library calls `stopPropagation()` on touch moves it handles.
 * `touchmove` must be non-passive so a drag can call `preventDefault()`.
 *
 * Nothing is attached while the preview sits at its fitted width: a non-passive
 * `touchmove` listener anywhere on the path blocks the browser's own scroll
 * compositing, which is what made a multi-page preview stutter. At fit the
 * canvas is exactly as tall as its scroller, so native `touch-action: pan-y`
 * scrolling is both correct and smooth.
 */
export function TouchPanCanvas({
  hostRef,
  scrollRef,
  fitScale,
  isZoomed,
  enabled,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  /** The exact `[data-canvas-scroll]` box that scrolls the paper on phones. */
  scrollRef: RefObject<HTMLDivElement | null>;
  fitScale: number;
  /** Mirrored from `useTransformComponent`; re-renders on every zoom change. */
  isZoomed: boolean;
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

    if (!host || !enabled || !isZoomed) {
      return;
    }

    let active = false;
    let committed = false;
    /**
     * Vertical pan position for this gesture. The library's `state` object is
     * read through a ref that only updates after a render, so a fast drag can
     * resolve the next move against a stale `positionY`. Tracking the accepted
     * pan locally keeps the canvas/page split exact at a page break.
     */
    let panPositionY = 0;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    const begin = (touch: Touch): void => {
      active = true;
      committed = false;
      panPositionY = stateRef.current.positionY;
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
        panPositionY,
        deltaY,
        instanceRef.current.bounds,
      );

      panPositionY += handoff.pan;

      if (deltaX !== 0 || handoff.pan !== 0) {
        void panByRef.current(deltaX, handoff.pan, 0);
      }

      // Hand the *entire* leftover to the paper scroller on the same move.
      // Ramping or dropping part of it leaves a dead zone at every page break,
      // which reads as "vertical scrolling is frozen, only sideways panning
      // works" once the canvas reaches its bottom bound.
      if (handoff.scroll !== 0) {
        scrollPageBy(host, handoff.scroll, scrollRef.current);
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
  }, [enabled, fitScale, isZoomed, hostRef, scrollRef]);

  return null;
}
