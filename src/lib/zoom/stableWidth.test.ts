import { describe, expect, it } from "vitest";

import {
  WIDTH_OSCILLATION_MAX_DELTA_PX,
  WIDTH_OSCILLATION_WINDOW_MS,
  initialStableWidthState,
  stabilizeObservedWidth,
  type StableWidthState,
} from "./stableWidth";

function feed(
  state: StableWidthState,
  entries: ReadonlyArray<readonly [number, number]>,
): { width: number; state: StableWidthState } {
  let result = { width: 0, state };

  for (const [width, time] of entries) {
    result = stabilizeObservedWidth(result.state, { width, time });
  }

  return result;
}

describe("stabilizeObservedWidth", () => {
  it("passes a single measurement through untouched", () => {
    const result = stabilizeObservedWidth(initialStableWidthState, {
      width: 326,
      time: 0,
    });

    expect(result.width).toBe(326);
    expect(result.state.lockedWidth).toBeNull();
  });

  it("tracks ordinary resizes that differ by more than the jitter band", () => {
    const result = feed(initialStableWidthState, [
      [326, 0],
      [420, 20],
      [600, 40],
    ]);

    expect(result.width).toBe(600);
    expect(result.state.lockedWidth).toBeNull();
  });

  it("locks to the smaller width when a scrollbar-sized A/B/A alternation appears", () => {
    const result = feed(initialStableWidthState, [
      [326, 0],
      [311, 16],
      [326, 32],
    ]);

    expect(result.width).toBe(311);
    expect(result.state.lockedWidth).toBe(311);
  });

  it("keeps returning the locked width for every later jitter sample", () => {
    const locked = feed(initialStableWidthState, [
      [326, 0],
      [311, 16],
      [326, 32],
    ]).state;
    const result = feed(locked, [
      [311, 48],
      [326, 64],
      [311, 80],
      [326, 96],
    ]);

    expect(result.width).toBe(311);
    expect(result.state.lockedWidth).toBe(311);
  });

  it("ignores two samples until a third confirms the alternation", () => {
    const result = feed(initialStableWidthState, [
      [326, 0],
      [311, 16],
    ]);

    expect(result.width).toBe(311);
    expect(result.state.lockedWidth).toBeNull();
  });

  it("does not lock when the two widths are further apart than the jitter band", () => {
    const result = feed(initialStableWidthState, [
      [326, 0],
      [300, 16],
      [326, 32],
    ]);

    expect(result.width).toBe(326);
    expect(result.state.lockedWidth).toBeNull();
  });

  it("does not lock when the alternation is slower than the time window", () => {
    const result = feed(initialStableWidthState, [
      [326, 0],
      [311, 100],
      [326, WIDTH_OSCILLATION_WINDOW_MS + 101],
    ]);

    expect(result.width).toBe(326);
    expect(result.state.lockedWidth).toBeNull();
  });

  it("releases the lock on a genuine resize and tracks the new width", () => {
    const locked = feed(initialStableWidthState, [
      [326, 0],
      [311, 16],
      [326, 32],
    ]).state;
    const result = stabilizeObservedWidth(locked, {
      width: 480,
      time: 200,
    });

    expect(result.width).toBe(480);
    expect(result.state.lockedWidth).toBeNull();
  });

  it("rejects invalid samples without changing the lock", () => {
    const locked = feed(initialStableWidthState, [
      [326, 0],
      [311, 16],
      [326, 32],
    ]).state;

    for (const width of [0, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = stabilizeObservedWidth(locked, { width, time: 48 });

      expect(result.width).toBe(311);
      expect(result.state).toBe(locked);
    }
  });

  it("prunes samples outside the window so old jitter cannot lock a new size", () => {
    const state = feed(initialStableWidthState, [
      [326, 0],
      [311, 16],
      [326, 32],
    ]).state;
    const released = stabilizeObservedWidth(state, { width: 480, time: 400 });

    expect(released.state.samples).toHaveLength(1);
    expect(released.state.samples[0].width).toBe(480);
  });

  it("exposes a jitter band wide enough for a typical scrollbar but not a resize", () => {
    expect(WIDTH_OSCILLATION_MAX_DELTA_PX).toBeGreaterThanOrEqual(15);
    expect(WIDTH_OSCILLATION_MAX_DELTA_PX).toBeLessThan(48);
  });
});
