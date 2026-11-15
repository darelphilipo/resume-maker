import { describe, expect, it } from "vitest";

import { MIN_FIT_SCALE, computeFitScale } from "./fitScale";

describe("computeFitScale", () => {
  it("returns a smaller scale when content overflows the page", () => {
    const scale = computeFitScale({
      totalHeightPx: 1316,
      contentHeightPx: 1090,
    });

    expect(scale).toBeGreaterThan(MIN_FIT_SCALE);
    expect(scale).toBeLessThan(1);
  });

  it("does nothing when the content already fits", () => {
    expect(
      computeFitScale({ totalHeightPx: 1000, contentHeightPx: 1090 }),
    ).toBeNull();
  });

  it("does not suggest shrinking an already compact document further", () => {
    expect(
      computeFitScale({
        totalHeightPx: 3000,
        contentHeightPx: 1090,
        currentFitScale: 0.5,
      }),
    ).toBeNull();
  });

  it("refuses targets below the minimum readable scale", () => {
    expect(
      computeFitScale({ totalHeightPx: 5000, contentHeightPx: 1090 }),
    ).toBeNull();
  });
});
