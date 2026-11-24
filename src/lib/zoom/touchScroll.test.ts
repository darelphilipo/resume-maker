import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findScrollableAncestor,
  isScrollableElement,
  scrollPageBy,
  scrollToResumeTop,
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

  it("scrolls the explicit paper scroller even when it is a descendant", () => {
    // Phone shape: [data-canvas-scroll] lives *inside* the touch host, so the
    // ancestor walk cannot find it and the preferred element must win.
    const host = document.createElement("div");
    const paper = makeScrollable("auto");

    host.append(paper);
    document.body.append(host);
    paper.scrollTop = 120;

    expect(scrollPageBy(host, 60, paper)).toBe(true);
    expect(paper.scrollTop).toBe(180);
  });

  it("falls back to an ancestor when the preferred box does not scroll", () => {
    // Wide coarse-pointer tablets keep [data-canvas-scroll] non-scrolling and
    // scroll the Preview panel instead.
    const ancestor = makeScrollable("auto");
    const host = document.createElement("div");
    const paper = makeScrollable("hidden", { scrollHeight: 200 });

    host.append(paper);
    ancestor.append(host);
    document.body.append(ancestor);
    ancestor.scrollTop = 200;

    expect(scrollPageBy(host, 40, paper)).toBe(true);
    expect(ancestor.scrollTop).toBe(240);
    expect(paper.scrollTop).toBe(0);
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

describe("scrollToResumeTop", () => {
  it("zeroes both the paper scroller and the scrolling ancestor", () => {
    // Desktop shape: the sticky panel is the scroller (ancestor of the root),
    // while [data-canvas-scroll] is a descendant that does not scroll at lg.
    const ancestor = makeScrollable("auto");
    const root = document.createElement("div");
    const scrollBox = makeScrollable("auto");

    root.append(scrollBox);
    ancestor.append(root);
    document.body.append(ancestor);
    scrollBox.scrollTop = 240;
    ancestor.scrollTop = 120;

    scrollToResumeTop(scrollBox, root);

    expect(scrollBox.scrollTop).toBe(0);
    expect(ancestor.scrollTop).toBe(0);
  });

  it("only zeroes the inner box when no ancestor scrolls", () => {
    // Phone shape: the inner [data-canvas-scroll] is the sole paper scroller.
    const wrapper = document.createElement("div");
    const root = document.createElement("div");
    const scrollBox = makeScrollable("auto");

    root.append(scrollBox);
    wrapper.append(root);
    document.body.append(wrapper);
    scrollBox.scrollTop = 240;

    scrollToResumeTop(scrollBox, root);

    expect(scrollBox.scrollTop).toBe(0);
  });

  it("tolerates missing elements", () => {
    expect(() => scrollToResumeTop(null, null)).not.toThrow();
  });
});
