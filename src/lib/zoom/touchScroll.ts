const SCROLLABLE_OVERFLOW = /(auto|scroll|overlay)/;

/**
 * True when an element is a vertical scroll container with content to scroll.
 *
 * Used by the zoomed-preview hand-off: the canvas already owns the touch, so
 * once it hits its pan bounds the remaining delta must be applied to the page
 * scroller by hand instead of relying on native scrolling.
 */
export function isScrollableElement(
  element: Element | null | undefined,
): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.scrollHeight <= element.clientHeight) {
    return false;
  }

  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
    return false;
  }

  return SCROLLABLE_OVERFLOW.test(window.getComputedStyle(element).overflowY);
}

/**
 * Finds the nearest ancestor that scrolls vertically, walking out from a host
 * element. On the mobile editor shell this resolves to `<main>`, which is the
 * only scroll container (see CONTEXT Decisions #1).
 */
export function findScrollableAncestor(
  element: Element | null,
): HTMLElement | null {
  let node = element?.parentElement ?? null;

  while (node) {
    if (isScrollableElement(node)) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

/**
 * Scrolls `deltaY` pixels on the canvas' own paper scroller when it scrolls,
 * otherwise on the closest scrollable ancestor of `origin`, falling back to the
 * window when the page itself is the scroller (desktop).
 *
 * The phone preview's `[data-canvas-scroll]` box is a *descendant* of the
 * viewport root that owns the touch listener, so `findScrollableAncestor`
 * cannot find it; `preferred` carries that exact element. A wide coarse-pointer
 * tablet is the opposite shape (`lg:overflow-visible` on the inner box, with the
 * Preview panel as the scroller), so a non-scrolling preferred element falls
 * back to the ancestor walk. Returns false when there was nothing to scroll.
 */
export function scrollPageBy(
  origin: Element | null,
  deltaY: number,
  preferred?: Element | null,
): boolean {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return false;
  }

  const scroller = isScrollableElement(preferred)
    ? (preferred as HTMLElement)
    : findScrollableAncestor(origin);

  if (scroller) {
    scroller.scrollTop += deltaY;
    return true;
  }

  if (typeof window === "undefined" || typeof window.scrollBy !== "function") {
    return false;
  }

  window.scrollBy(0, deltaY);
  return true;
}

/**
 * Returns the paper scroller to the top so a preview reset lands the candidate
 * back on Page 1, exactly as on first opening the Preview tab.
 *
 * The element that scrolls the pages differs by viewport: on phones it is the
 * inner `[data-canvas-scroll]` box (a descendant of the viewport root, see
 * CONTEXT #37), while at `lg` the sticky Preview panel is the scroller (an
 * ancestor of the root, see CONTEXT #28). Reset both so the reset controls
 * behave identically at every width. The inner box is passed explicitly
 * because `findScrollableAncestor` only walks upward.
 */
export function scrollToResumeTop(
  scrollBox: Element | null,
  origin: Element | null,
): void {
  if (scrollBox instanceof HTMLElement && scrollBox.scrollTop !== 0) {
    scrollBox.scrollTop = 0;
  }

  const ancestor = findScrollableAncestor(origin);

  if (ancestor && ancestor !== scrollBox && ancestor.scrollTop !== 0) {
    ancestor.scrollTop = 0;
  }
}
