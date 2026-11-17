import { describe, expect, it } from "vitest";

import {
  CANVAS_PINCH_STEP,
  PREVIEW_ZOOM_EPSILON,
  TOUCH_AXIS_SLOP_PX,
  canvasGestureConfig,
  canvasTouchAction,
  hasClearedTouchSlop,
  isPreviewZoomed,
} from "./canvasGestures";

describe("canvasGestureConfig", () => {
  it("keeps pinch-to-zoom available on touch screens", () => {
    const config = canvasGestureConfig(true);

    expect(config.pinch).toEqual({
      step: CANVAS_PINCH_STEP,
      disabled: false,
    });
  });

  it("keeps one-finger touch drags as native page scroll at fit", () => {
    const config = canvasGestureConfig(true);

    expect(config.panning.disabled).toBe(true);
  });

  it("leaves desktop drag panning untouched", () => {
    const config = canvasGestureConfig(false);

    expect(config.pinch.disabled).toBe(false);
    expect(config.panning.disabled).toBe(false);
  });
});

describe("canvasTouchAction", () => {
  it("keeps vertical page scrolling while the page fits", () => {
    expect(canvasTouchAction(true, false)).toBe("pan-y");
  });

  it("locks native scrolling out while the page is zoomed", () => {
    expect(canvasTouchAction(true, true)).toBe("none");
  });

  it("uses the browser default on fine pointers", () => {
    expect(canvasTouchAction(false, false)).toBe("auto");
    expect(canvasTouchAction(false, true)).toBe("auto");
  });
});

describe("isPreviewZoomed", () => {
  it("is false at or below the fit scale", () => {
    expect(isPreviewZoomed(0.5, 0.5)).toBe(false);
    expect(isPreviewZoomed(0.4, 0.5)).toBe(false);
  });

  it("is true once the scale grows past the fit scale", () => {
    expect(isPreviewZoomed(0.5 + PREVIEW_ZOOM_EPSILON * 2, 0.5)).toBe(true);
    expect(isPreviewZoomed(1.25, 0.5)).toBe(true);
  });

  it("ignores non-finite scales", () => {
    expect(isPreviewZoomed(Number.NaN, 0.5)).toBe(false);
    expect(isPreviewZoomed(1, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("hasClearedTouchSlop", () => {
  it("keeps small and ambiguous movement uncommitted", () => {
    expect(hasClearedTouchSlop(TOUCH_AXIS_SLOP_PX, 2)).toBe(false);
    expect(hasClearedTouchSlop(-3, 4)).toBe(false);
  });

  it("commits a drag once either axis clears the slop", () => {
    expect(hasClearedTouchSlop(-18, 4)).toBe(true);
    expect(hasClearedTouchSlop(3, -24)).toBe(true);
    expect(hasClearedTouchSlop(TOUCH_AXIS_SLOP_PX + 1, 0)).toBe(true);
  });

  it("ignores non-finite movement", () => {
    expect(hasClearedTouchSlop(Number.NaN, 30)).toBe(false);
    expect(hasClearedTouchSlop(30, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
