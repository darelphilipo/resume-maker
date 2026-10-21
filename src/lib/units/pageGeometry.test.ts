import { describe, expect, it } from "vitest";
import { MM_TO_PX, PAPER, PT_TO_PX, pageGeometry } from "./pageGeometry";

describe("pageGeometry", () => {
  it("converts A4 defaults to exact pixel geometry", () => {
    const geometry = pageGeometry("a4", 14, 12);

    expect(geometry.widthMm).toBe(PAPER.a4.widthMm);
    expect(geometry.heightMm).toBe(PAPER.a4.heightMm);
    expect(geometry.widthPx).toBeCloseTo(793.7008, 4);
    expect(geometry.heightPx).toBeCloseTo(1122.5197, 4);
    expect(geometry.contentWidthPx).toBeCloseTo(756.3675, 4);
    expect(geometry.contentHeightPx).toBeCloseTo(1090.5197, 4);
  });

  it("converts Letter defaults to exact pixel geometry", () => {
    const geometry = pageGeometry("letter", 14, 12);

    expect(geometry.widthMm).toBe(PAPER.letter.widthMm);
    expect(geometry.heightMm).toBe(PAPER.letter.heightMm);
    expect(geometry.widthPx).toBeCloseTo(816.0, 4);
    expect(geometry.heightPx).toBeCloseTo(1056.0, 4);
    expect(geometry.contentWidthPx).toBeCloseTo(778.6667, 4);
    expect(geometry.contentHeightPx).toBeCloseTo(1024.0, 4);
  });

  it("exposes the unit conversion constants", () => {
    expect(MM_TO_PX).toBeCloseTo(3.7795275590551185, 12);
    expect(PT_TO_PX).toBeCloseTo(4 / 3, 12);
  });

  it("equals page size when margins are zero", () => {
    const geometry = pageGeometry("a4", 0, 0);

    expect(geometry.contentWidthPx).toBe(geometry.widthPx);
    expect(geometry.contentHeightPx).toBe(geometry.heightPx);
  });

  it("throws a RangeError for negative margins", () => {
    expect(() => pageGeometry("a4", -1, 12)).toThrow(RangeError);
    expect(() => pageGeometry("a4", 14, -1)).toThrow(RangeError);
  });

  it("throws a RangeError when margins exceed the page", () => {
    expect(() => pageGeometry("a4", 0, 500)).toThrow(RangeError);
    expect(() => pageGeometry("a4", 400, 0)).toThrow(RangeError);
  });
});
