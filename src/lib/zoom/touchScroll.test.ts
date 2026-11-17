import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findScrollableAncestor,
  isScrollableElement,
  scrollPageBy,
} from "./touchScroll";

function makeScrollable(
  overflowY: string,
  { clientHeight = 200, scrollHeight = 800 } = {},
): HTMLDivElement {
  const element = document.createElement("div");

  element.style.overflowY = overflowY;

  Object.defineProperty(element, "clientHeight", {
    value: clientHeight,
    configurable: true,
  });
  Object.defineProperty(element, "scrollHeight", {
    value: scrollHeight,
    configurable: true,
  });

  return element;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("isScrollableElement", () => {
  it("accepts an overflowing auto/scroll container", () => {
    expect(isScrollableElement(makeScrollable("auto"))).toBe(true);
    expect(isScrollableElement(makeScrollable("scroll"))).toBe(true);
  });

  it("rejects containers that clip or already fit", () => {
    expect(isScrollableElement(makeScrollable("hidden"))).toBe(false);
    expect(isScrollableElement(makeScrollable("auto", { scrollHeight: 200 }))).toBe(
      false,
    );
    expect(isScrollableElement(null)).toBe(false);
  });
});

describe("findScrollableAncestor", () => {
  it("returns the nearest scrolling ancestor", () => {
    const outer = makeScrollable("auto");
    const inner = makeScrollable("auto");
    const host = document.createElement("div");

    inner.append(host);
    outer.append(inner);
    document.body.append(outer);

    expect(findScrollableAncestor(host)).toBe(inner);
  });

  it("skips non-scrolling wrappers", () => {
    const outer = makeScrollable("scroll");
    const wrapper = document.createElement("div");
    const host = document.createElement("div");

    wrapper.append(host);
    outer.append(wrapper);
    document.body.append(outer);

    expect(findScrollableAncestor(host)).toBe(outer);
  });

  it("returns null when nothing scrolls", () => {
    const host = document.createElement("div");

    document.body.append(host);

    expect(findScrollableAncestor(host)).toBeNull();
    expect(findScrollableAncestor(null)).toBeNull();
  });
});

describe("scrollPageBy", () => {
  it("scrolls the nearest scrollable ancestor", () => {
    const scroller = makeScrollable("auto");
    const host = document.createElement("div");

    scroller.append(host);
    document.body.append(scroller);
    scroller.scrollTop = 300;

    // A downward drag at the canvas top scrolls the page back up.
    expect(scrollPageBy(host, -120)).toBe(true);
    expect(scroller.scrollTop).toBe(180);

    expect(scrollPageBy(host, 40)).toBe(true);
    expect(scroller.scrollTop).toBe(220);
  });

  it("does nothing for empty or non-finite deltas", () => {
    const scroller = makeScrollable("auto");
    const host = document.createElement("div");

    scroller.append(host);
    document.body.append(scroller);

    expect(scrollPageBy(host, 0)).toBe(false);
    expect(scrollPageBy(host, Number.NaN)).toBe(false);
  });

  it("falls back to the window scroller", () => {
    const scrollBy = vi.fn();

    vi.stubGlobal("scrollBy", scrollBy);

    try {
      expect(scrollPageBy(document.createElement("div"), -40)).toBe(true);
      expect(scrollBy).toHaveBeenCalledWith(0, -40);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
