"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import { findScrollableAncestor } from "@/lib/zoom/touchScroll";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Keeps a scroll container's offset across a re-measure cycle.
 *
 * Reordering sections with `Move up` / `Move down` changes the canonical
 * section order, so `usePageLayout` briefly reports `isMeasuring` and
 * `pages: [[]]`. On desktop the Preview panel is its own scroll container
 * (`lg:max-h-… lg:overflow-y-auto`): the paper stack is swapped for the short
 * placeholder, the browser clamps `scrollTop` to 0, and the user is thrown back
 * to the top of the preview even though nothing they were reading changed.
 *
 * The last offset is remembered from real scroll events and restored once
 * measurement finishes. A clamp caused by the shrink is ignored because the
 * container no longer has content to scroll at that moment.
 */
export function usePreservedScroll<T extends Element>(
  hostRef: RefObject<T | null>,
  paused: boolean,
): void {
  const offsetRef = useRef(0);

  useEffect(() => {
    const remember = (event: Event): void => {
      const target = event.target;
      const host = hostRef.current;

      if (!(target instanceof HTMLElement) || !host) {
        return;
      }

      if (!target.contains(host)) {
        return;
      }

      // The placeholder collapses the panel, so the browser clamps scrollTop
      // to 0. That is not a scroll the user made; keep the previous offset.
      if (target.scrollHeight <= target.clientHeight) {
        return;
      }

      offsetRef.current = target.scrollTop;
    };

    // Scroll does not bubble, but a capture listener still sees every
    // descendant scroller, so this works for `<main>` on phones and the
    // sticky Preview panel on desktop alike.
    document.addEventListener("scroll", remember, true);

    return () => {
      document.removeEventListener("scroll", remember, true);
    };
  }, [hostRef]);

  useIsomorphicLayoutEffect(() => {
    if (paused) {
      return;
    }

    const scroller = findScrollableAncestor(hostRef.current);

    if (!scroller) {
      return;
    }

    if (scroller.scrollTop !== offsetRef.current) {
      scroller.scrollTop = offsetRef.current;
    }
  }, [hostRef, paused]);
}
