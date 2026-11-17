import { describe, expect, it } from "vitest";

import {
  CANVAS_PINCH_STEP,
  PREVIEW_ZOOM_EPSILON,
  TOUCH_AXIS_SLOP_PX,
  canvasGestureConfig,
  isPreviewZoomed,
  resolveTouchPanAxis,
} from "./canvasGestures";

describe("canvasGestureConfig", () => {
  it("keeps pinch-to-zoom available on touch screens", () => {
    const config = canvasGestureConfig(true);

    expect(config.pinch).toEqual({
      step: CANVAS_PINCH_STEP,
      disabled: false,
    });
  });

  it("keeps one-finger touch drags as native page scroll", () => {
    const config = canvasGestureConfig(true);

    expect(config.panning.disabled).toBe(true);
    expect(config.touchAction).toBe("pan-y");
  });

  it("leaves desktop drag panning and wheel behaviour untouched", () => {
    const config = canvasGestureConfig(false);

    expect(config.pinch.disabled).toBe(false);
    expect(config.panning.disabled).toBe(false);
    expect(config.touchAction).toBe("auto");
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

describe("resolveTouchPanAxis", () => {
  it("stays uncommitted until the finger clears the slop threshold", () => {
    expect(resolveTouchPanAxis(TOUCH_AXIS_SLOP_PX, 1)).toBeNull();
    expect(resolveTouchPanAxis(-3, 4)).toBeNull();
  });

  it("locks to horizontal for a sideways drag", () => {
    expect(resolveTouchPanAxis(-18, 4)).toBe("horizontal");
    expect(resolveTouchPanAxis(30, 12)).toBe("horizontal");
  });

  it("locks to vertical for a scrolling drag", () => {
    expect(resolveTouchPanAxis(3, -24)).toBe("vertical");
    expect(resolveTouchPanAxis(12, 30)).toBe("vertical");
  });

  it("prefers page scroll when both axes match", () => {
    expect(resolveTouchPanAxis(20, 20)).toBe("vertical");
  });

  it("ignores non-finite movement", () => {
    expect(resolveTouchPanAxis(Number.NaN, 30)).toBeNull();
    expect(resolveTouchPanAxis(30, Number.POSITIVE_INFINITY)).toBeNull();
  });
});
