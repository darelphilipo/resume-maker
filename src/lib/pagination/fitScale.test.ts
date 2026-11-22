import { describe, expect, it } from "vitest";

import {
  FIT_SAFETY_MARGIN_PX,
  FIT_VIEWPORT_PADDING_PX,
  MIN_FIT_SCALE,
  computeFitScale,
  computeWidthFitScale,
} from "./fitScale";

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

  it("enforces a readable floor instead of microscopic text", () => {
    expect(MIN_FIT_SCALE).toBe(0.78);

    const readable = computeFitScale({
      totalHeightPx: 1300,
      contentHeightPx: 1090,
    });

    expect(readable).not.toBeNull();
    expect(readable!).toBeGreaterThanOrEqual(MIN_FIT_SCALE);

    // ~74% would fit one page but is too small to read.
    expect(
      computeFitScale({ totalHeightPx: 1450, contentHeightPx: 1090 }),
    ).toBeNull();
  });
});

describe("computeWidthFitScale", () => {
  it("subtracts both the preview padding and the date safety margin", () => {
    const containerWidthPx = 326;
    const pageWidthPx = 794;
    const usableWidthPx =
      containerWidthPx - FIT_VIEWPORT_PADDING_PX - FIT_SAFETY_MARGIN_PX;

    expect(
      computeWidthFitScale({ containerWidthPx, pageWidthPx }),
    ).toBeCloseTo(usableWidthPx / pageWidthPx, 10);
  });

  it("leaves room for a right-aligned date instead of filling every pixel", () => {
    const containerWidthPx = 326;
    const pageWidthPx = 794;
    const scale = computeWidthFitScale({ containerWidthPx, pageWidthPx });

    expect(scale * pageWidthPx).toBeLessThanOrEqual(
      containerWidthPx - FIT_VIEWPORT_PADDING_PX - FIT_SAFETY_MARGIN_PX,
    );
    expect(scale).toBeLessThan(
      (containerWidthPx - FIT_VIEWPORT_PADDING_PX) / pageWidthPx,
    );
  });

  it("caps a wide viewport at the maximum scale", () => {
    expect(
      computeWidthFitScale({ containerWidthPx: 1600, pageWidthPx: 600 }),
    ).toBe(1);
  });

  it("keeps the minimum zoom scale on a very narrow viewport", () => {
    expect(
      computeWidthFitScale({ containerWidthPx: 40, pageWidthPx: 794 }),
    ).toBe(0.2);
  });

  it("falls back safely when the page width is unusable", () => {
    expect(
      computeWidthFitScale({ containerWidthPx: 326, pageWidthPx: 0 }),
    ).toBe(1);
  });
});
