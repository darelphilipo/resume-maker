import { describe, expect, it } from "vitest";

import {
  FIT_SAFETY_MARGIN_PX,
  FIT_VIEWPORT_PADDING_PX,
  MIN_FIT_BODY_FONT_PT,
  MIN_FIT_MARGIN_Y_PT,
  MIN_FIT_SCALE,
  computeFitMarginY,
  computeFitScale,
  computeMinimumFitScale,
  computeWidthFitScale,
  shouldResetFitScale,
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

  it("damps the shrink so prose-heavy resumes do not over-shrink", () => {
    const totalHeightPx = 1316;
    const contentHeightPx = 1090;
    const linear = (contentHeightPx / totalHeightPx) * 0.98;
    const expected =
      Math.floor(
        Math.pow(contentHeightPx / totalHeightPx, 0.72) * 0.98 * 1000,
      ) / 1000;

    const scale = computeFitScale({ totalHeightPx, contentHeightPx });

    expect(scale).toBe(expected);
    expect(scale!).toBeGreaterThan(linear);
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
      computeFitScale({ totalHeightPx: 1600, contentHeightPx: 1090 }),
    ).toBeNull();
  });

  it("raises the floor for a smaller body font so it never prints below 8pt", () => {
    expect(MIN_FIT_BODY_FONT_PT).toBe(8);
    expect(computeMinimumFitScale(11)).toBe(MIN_FIT_SCALE);
    expect(computeMinimumFitScale(9)).toBeCloseTo(8 / 9, 10);
    expect(computeMinimumFitScale(8)).toBe(1);
    expect(computeMinimumFitScale(undefined)).toBe(MIN_FIT_SCALE);

    // The damped target is ~0.856, which is readable at 11pt but would print
    // 9pt × 0.856 = 7.7pt, so a 9pt resume must stay on two pages instead.
    expect(
      computeFitScale({
        totalHeightPx: 1316,
        contentHeightPx: 1090,
        bodyFontSize: 9,
      }),
    ).toBeNull();

    // A 10pt body has a 0.8 floor, so the same target is allowed.
    expect(
      computeFitScale({
        totalHeightPx: 1316,
        contentHeightPx: 1090,
        bodyFontSize: 10,
      }),
    ).not.toBeNull();
  });
});

describe("computeFitMarginY", () => {
  it("scales a generous margin down while a fit is applied", () => {
    expect(computeFitMarginY(48, 0.8)).toBeCloseTo(38.4, 10);
  });

  it("stops at the minimum margin floor", () => {
    expect(MIN_FIT_MARGIN_Y_PT).toBe(32);
    expect(computeFitMarginY(48, 0.5)).toBe(MIN_FIT_MARGIN_Y_PT);
  });

  it("never inflates a margin that is already below the floor", () => {
    // The default 12pt margin must stay 12pt, not jump to the 32pt floor.
    expect(computeFitMarginY(12, 0.86)).toBe(12);
  });

  it("leaves the margin alone at full size or with an unusable scale", () => {
    expect(computeFitMarginY(48, 1)).toBe(48);
    expect(computeFitMarginY(48, Number.NaN)).toBe(48);
    expect(computeFitMarginY(0, 0.8)).toBe(0);
  });
});

describe("shouldResetFitScale", () => {
  it("resets once the fitted stack would fit at full size", () => {
    expect(
      shouldResetFitScale({
        totalHeightPx: 800,
        contentHeightPx: 1090,
        currentFitScale: 0.85,
      }),
    ).toBe(true);
  });

  it("keeps the fit while the unscaled stack still overflows", () => {
    expect(
      shouldResetFitScale({
        totalHeightPx: 1200,
        contentHeightPx: 1090,
        currentFitScale: 0.85,
      }),
    ).toBe(false);
  });

  it("does nothing at full size or before anything is measured", () => {
    expect(
      shouldResetFitScale({
        totalHeightPx: 800,
        contentHeightPx: 1090,
        currentFitScale: 1,
      }),
    ).toBe(false);
    expect(
      shouldResetFitScale({
        totalHeightPx: 0,
        contentHeightPx: 1090,
        currentFitScale: 0.85,
      }),
    ).toBe(false);
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
