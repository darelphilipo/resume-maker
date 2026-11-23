import { describe, expect, it } from "vitest";

import {
  CANVAS_SCROLL_PADDING_PX,
  PAGE_STACK_GAP_PX,
  canvasDeskHeight,
  centeredCanvasOffsetX,
  computeCanvasFrame,
} from "./canvasFrame";

const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;

function frame(input: {
  pageCount?: number;
  pageWidthPx?: number;
  pageHeightPx?: number;
  fitScale?: number;
}) {
  return computeCanvasFrame({
    pageCount: input.pageCount ?? 1,
    pageWidthPx: input.pageWidthPx ?? PAGE_WIDTH,
    pageHeightPx: input.pageHeightPx ?? PAGE_HEIGHT,
    fitScale: input.fitScale ?? 1,
  });
}

describe("computeCanvasFrame", () => {
  it("scales a single page height", () => {
    expect(frame({ pageCount: 1, fitScale: 0.5 }).height).toBe(
      PAGE_HEIGHT * 0.5,
    );
  });

  it("adds one scaled gap between pages", () => {
    expect(frame({ pageCount: 2, fitScale: 0.5 }).height).toBe(
      (PAGE_HEIGHT * 2 + PAGE_STACK_GAP_PX) * 0.5,
    );
  });

  it("keeps paper dimensions at scale 1", () => {
    const result = frame({ pageCount: 2, fitScale: 1 });

    expect(result.width).toBe(PAGE_WIDTH);
    expect(result.height).toBe(PAGE_HEIGHT * 2 + PAGE_STACK_GAP_PX);
    expect(result.scale).toBe(1);
  });

  it("clamps a zero page count to one page", () => {
    expect(frame({ pageCount: 0, fitScale: 0.5 }).height).toBe(
      PAGE_HEIGHT * 0.5,
    );
  });

  it("dividing the frame width by its scale yields the paper width", () => {
    const result = frame({ pageCount: 3, fitScale: 0.431 });

    expect(result.width / result.scale).toBeCloseTo(PAGE_WIDTH, 10);
  });

  it("guards against non-finite page counts", () => {
    expect(frame({ pageCount: Number.NaN }).height).toBe(PAGE_HEIGHT);
  });
});

describe("CANVAS_SCROLL_PADDING_PX", () => {
  it("matches the scroller's py-3 padding", () => {
    expect(CANVAS_SCROLL_PADDING_PX).toBe(12);
  });

  it("wraps the paper at every fit scale", () => {
    for (const scale of [0.5, 0.78, 1]) {
      const stack = frame({ pageCount: 2, fitScale: scale }).height;

      expect(canvasDeskHeight(stack)).toBe(
        stack + CANVAS_SCROLL_PADDING_PX * 2,
      );
      expect(canvasDeskHeight(stack)).toBeGreaterThan(stack);
    }
  });
});

describe("canvasDeskHeight", () => {
  it("adds both paddings to the scaled stack height", () => {
    expect(canvasDeskHeight(800)).toBe(824);
    expect(canvasDeskHeight(1624)).toBe(1648);
  });

  it("covers the first and last edges of any page count", () => {
    for (const pageCount of [1, 2, 4]) {
      for (const fitScale of [0.5, 0.78, 1]) {
        const stack = frame({ pageCount, fitScale }).height;
        const desk = canvasDeskHeight(stack);

        expect(desk - stack).toBe(CANVAS_SCROLL_PADDING_PX * 2);
      }
    }
  });

  it("reports no desk for an empty or invalid stack", () => {
    expect(canvasDeskHeight(0)).toBe(0);
    expect(canvasDeskHeight(-10)).toBe(0);
    expect(canvasDeskHeight(Number.NaN)).toBe(0);
  });
});

describe("centeredCanvasOffsetX", () => {
  it("splits the leftover space when the paper is narrower than the viewport", () => {
    expect(centeredCanvasOffsetX(900, 700)).toBe(100);
  });

  it("does not offset a paper that already fills the viewport", () => {
    expect(centeredCanvasOffsetX(700, 700)).toBe(0);
    expect(centeredCanvasOffsetX(700, 820)).toBe(0);
  });

  it("falls back to zero for missing or invalid sizes", () => {
    expect(centeredCanvasOffsetX(0, 700)).toBe(0);
    expect(centeredCanvasOffsetX(900, 0)).toBe(0);
    expect(centeredCanvasOffsetX(Number.NaN, 700)).toBe(0);
    expect(centeredCanvasOffsetX(900, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
