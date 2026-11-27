import { describe, expect, it } from "vitest";

import {
  MAX_ZOOM_STEP_PERCENT,
  ZOOM_STEP_PERCENTS,
  nextZoomStepPercent,
} from "./zoomSteps";

describe("nextZoomStepPercent", () => {
  it("steps the full 25% ladder relative to fit", () => {
    expect(ZOOM_STEP_PERCENTS).toEqual([100, 125, 150, 175, 200, 225]);
    expect(MAX_ZOOM_STEP_PERCENT).toBe(225);

    const climbed: number[] = [100];
    let step = nextZoomStepPercent(100, 1);

    while (step !== null) {
      climbed.push(step);
      step = nextZoomStepPercent(step, 1);
    }

    expect(climbed).toEqual([100, 125, 150, 175, 200, 225]);
  });

  it("returns to 100% directly instead of stopping at an off-ladder step", () => {
    expect(nextZoomStepPercent(102, -1)).toBe(100);
    expect(nextZoomStepPercent(102, 1)).toBe(125);
    expect(nextZoomStepPercent(225, -1)).toBe(200);
  });

  it("clamps at both ends of the ladder", () => {
    expect(nextZoomStepPercent(100, -1)).toBeNull();
    expect(nextZoomStepPercent(80, -1)).toBeNull();
    expect(nextZoomStepPercent(225, 1)).toBeNull();
    expect(nextZoomStepPercent(300, 1)).toBeNull();
    expect(nextZoomStepPercent(300, -1)).toBe(225);
  });
});
