import { act, renderHook } from "@testing-library/react";
import { isValidElement } from "react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import type { MeasureLayerProps } from "@/components/preview/MeasureLayer";
import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

import {
  isMeasurementComplete,
  usePageLayout,
  type MeasureFn,
} from "./usePageLayout";

function makeDoc() {
  const doc = createEmptyResume();
  doc.metadata.layout.pages = [
    {
      fullWidth: false,
      main: ["experience", "skills"],
      sidebar: [],
    },
  ];

  return doc;
}

function measureLayerOf(node: unknown): ReactElement<MeasureLayerProps> {
  if (!isValidElement<MeasureLayerProps>(node)) {
    throw new Error("Expected the hook to return a measure layer element.");
  }

  return node;
}

function report(
  result: { current: ReturnType<typeof usePageLayout> },
  id: string,
  heightPx: number,
): void {
  act(() => {
    measureLayerOf(result.current.measureLayer).props.onMeasure(id, heightPx);
  });
}

describe("usePageLayout", () => {
  it("packs injected measurements and stops measuring after the first result", () => {
    const doc = makeDoc();
    const measure: MeasureFn = () => ({
      headerHeightPx: 100,
      heights: { experience: 500, skills: 500 },
    });

    const { result } = renderHook(() => usePageLayout(doc, { measure }));

    expect(result.current.pages).toEqual([
      ["__header", "experience"],
      ["skills"],
    ]);
    expect(result.current.overflowPx).toBe(0);
    expect(result.current.isMeasuring).toBe(false);
    expect(result.current.measureLayer).toBeNull();
  });

  it("omits zero-height sections from injected measurements", () => {
    const doc = makeDoc();
    const measure: MeasureFn = () => ({
      headerHeightPx: 100,
      heights: { experience: 0, skills: 100 },
    });

    const { result } = renderHook(() => usePageLayout(doc, { measure }));

    expect(result.current.pages).toEqual([["__header", "skills"]]);
    expect(result.current.overflowPx).toBe(0);
    expect(result.current.isMeasuring).toBe(false);
  });

  it("reports overflow for a section taller than a page", () => {
    const doc = makeDoc();
    const measure: MeasureFn = () => ({
      headerHeightPx: 100,
      heights: { experience: 2000, skills: 100 },
    });

    const { result } = renderHook(() => usePageLayout(doc, { measure }));

    expect(result.current.pages).toEqual([["__header"], ["experience"], ["skills"]]);
    expect(result.current.overflowPx).toBeCloseTo(
      2000 - result.current.contentHeightPx,
    );
  });

  it("derives the render order from main then sidebar", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [
      {
        fullWidth: false,
        main: ["experience"],
        sidebar: ["skills"],
      },
    ];
    const orders: string[][] = [];
    const measure: MeasureFn = (order) => {
      orders.push([...order]);
      return { headerHeightPx: 50, heights: { experience: 100, skills: 100 } };
    };

    const { result } = renderHook(() => usePageLayout(doc, { measure }));

    expect(orders).toEqual([["experience", "skills"]]);
    expect(result.current.pages).toEqual([
      ["__header", "experience", "skills"],
    ]);
  });

  it("forces a section with startOnNewPage onto the next page", () => {
    const doc = makeDoc();
    doc.sections.skills.startOnNewPage = true;
    const measure: MeasureFn = () => ({
      headerHeightPx: 100,
      heights: { experience: 100, skills: 100 },
    });

    const { result } = renderHook(() => usePageLayout(doc, { measure }));

    expect(result.current.pages).toEqual([
      ["__header", "experience"],
      ["skills"],
    ]);
  });

  it("uses the default section order when the layout has no page", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages = [];
    let received: readonly string[] = [];
    const measure: MeasureFn = (order) => {
      received = order;
      return { headerHeightPx: 10, heights: {} };
    };

    renderHook(() => usePageLayout(doc, { measure }));

    expect(received[0]).toBe("summary");
    expect(received).toContain("experience");
  });

  it("stays in the measuring state until a result arrives", () => {
    const doc = makeDoc();
    const measure: MeasureFn = () => null;

    const { result } = renderHook(() => usePageLayout(doc, { measure }));

    expect(result.current.pages).toEqual([[]]);
    expect(result.current.overflowPx).toBe(0);
    expect(result.current.isMeasuring).toBe(true);
  });

  it("exposes a hidden measure layer when no measurer is injected", () => {
    const doc = makeDoc();

    const { result } = renderHook(() => usePageLayout(doc));

    expect(result.current.isMeasuring).toBe(true);
    expect(result.current.measureLayer).not.toBeNull();
  });

  it("stays measuring until the header and every section have reported", () => {
    const doc = makeDoc();
    const { result } = renderHook(() => usePageLayout(doc));

    expect(result.current.isMeasuring).toBe(true);
    expect(result.current.pages).toEqual([[]]);

    report(result, "__header", 100);
    expect(result.current.isMeasuring).toBe(true);

    report(result, "experience", 100);
    expect(result.current.isMeasuring).toBe(true);

    report(result, "skills", 0);

    expect(result.current.isMeasuring).toBe(false);
    expect(result.current.pages).toEqual([["__header", "experience"]]);
  });

  it("clears a stale section height when it later reports zero", () => {
    const doc = makeDoc();
    const { result } = renderHook(() => usePageLayout(doc));

    report(result, "__header", 100);
    report(result, "experience", 400);
    report(result, "skills", 400);

    expect(result.current.pages).toEqual([
      ["__header", "experience", "skills"],
    ]);

    report(result, "experience", 0);

    expect(result.current.pages).toEqual([["__header", "skills"]]);
  });

  it("resets measurement when the section order changes", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: ResumeDocument }) => usePageLayout(value),
      { initialProps: { value: makeDoc() } },
    );

    report(result, "__header", 100);
    report(result, "experience", 100);
    report(result, "skills", 100);
    expect(result.current.isMeasuring).toBe(false);

    const nextDoc = makeDoc();
    nextDoc.metadata.layout.pages = [
      {
        fullWidth: false,
        main: ["summary"],
        sidebar: [],
      },
    ];

    rerender({ value: nextDoc });

    expect(result.current.isMeasuring).toBe(true);
    expect(result.current.pages).toEqual([[]]);
  });
});

describe("isMeasurementComplete", () => {
  it("requires the header and every section id", () => {
    expect(isMeasurementComplete(["a"], false, { a: 0 })).toBe(false);
    expect(isMeasurementComplete(["a"], true, {})).toBe(false);
    expect(isMeasurementComplete(["a"], true, { a: 0 })).toBe(true);
    expect(isMeasurementComplete(["a", "b"], true, { a: 0, b: 0 })).toBe(true);
  });
});
