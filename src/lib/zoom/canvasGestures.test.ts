import { describe, expect, it } from "vitest";

import { CANVAS_PINCH_STEP, canvasGestureConfig } from "./canvasGestures";

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
