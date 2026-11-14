import { describe, expect, it } from "vitest";

import {
  WHEEL_ZOOM_INTENSITY,
  normalizeWheelDelta,
  wheelZoomTarget,
} from "./wheelZoom";

const DOM_DELTA_PIXEL = 0;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

describe("normalizeWheelDelta", () => {
  it("passes pixel deltas through unchanged", () => {
    expect(normalizeWheelDelta(-100, DOM_DELTA_PIXEL)).toBe(-100);
    expect(normalizeWheelDelta(3, DOM_DELTA_PIXEL)).toBe(3);
  });

  it("converts line deltas to roughly one text line of pixels", () => {
    expect(normalizeWheelDelta(3, DOM_DELTA_LINE)).toBe(48);
    expect(normalizeWheelDelta(-1, DOM_DELTA_LINE)).toBe(-16);
  });

  it("converts page deltas to roughly one page of pixels", () => {
    expect(normalizeWheelDelta(1, DOM_DELTA_PAGE)).toBe(400);
    expect(normalizeWheelDelta(-2, DOM_DELTA_PAGE)).toBe(-800);
  });

  it("treats unknown delta modes as pixels", () => {
    expect(normalizeWheelDelta(-100, 7)).toBe(-100);
  });

  it("returns zero for non-finite deltas", () => {
    expect(normalizeWheelDelta(Number.NaN, DOM_DELTA_PIXEL)).toBe(0);
    expect(normalizeWheelDelta(Number.POSITIVE_INFINITY, DOM_DELTA_LINE)).toBe(
      0,
    );
    expect(normalizeWheelDelta(Number.NEGATIVE_INFINITY, DOM_DELTA_PAGE)).toBe(
      0,
    );
  });
});

describe("wheelZoomTarget", () => {
  it("exposes a positive intensity constant", () => {
    expect(WHEEL_ZOOM_INTENSITY).toBeGreaterThan(0);
  });

  it("zooms about 9-10% for one conventional mouse notch", () => {
    const target = wheelZoomTarget(1, normalizeWheelDelta(-100, 0), 0.2, 2);

    expect(target).toBeGreaterThanOrEqual(1.09);
    expect(target).toBeLessThanOrEqual(1.1);
  });

  it("applies the same ratio at every zoom level", () => {
    const delta = -100;
    const atHalf = wheelZoomTarget(0.5, delta, 0.2, 8) / 0.5;
    const atOneAndAHalf = wheelZoomTarget(1.5, delta, 0.2, 8) / 1.5;

    expect(atHalf).toBeCloseTo(atOneAndAHalf, 10);
  });

  it("clamps the result to minScale and maxScale", () => {
    expect(wheelZoomTarget(0.21, 10_000, 0.2, 2)).toBe(0.2);
    expect(wheelZoomTarget(1.9, -10_000, 0.2, 2)).toBe(2);
  });

  it("clamps the per-call factor so one burst cannot cross the range", () => {
    expect(wheelZoomTarget(1, -1_000_000, 0.0001, 100)).toBeCloseTo(1.6, 10);
    expect(wheelZoomTarget(1, 1_000_000, 0.0001, 100)).toBeCloseTo(
      1 / 1.6,
      10,
    );
  });
});
