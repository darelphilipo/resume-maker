import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import { MeasureLayer } from "./MeasureLayer";

function mockLayoutWidth(width: number): () => void {
  const clientWidth = vi
    .spyOn(Element.prototype, "clientWidth", "get")
    .mockReturnValue(width);
  const boundingRect = vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockImplementation(
      () =>
        ({
          width,
          height: 0,
          top: 0,
          left: 0,
          right: width,
          bottom: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    );

  return () => {
    clientWidth.mockRestore();
    boundingRect.mockRestore();
  };
}

describe("MeasureLayer", () => {
  it("reports zero heights while the measurement root has layout width", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume();
      const onMeasure = vi.fn();

      render(
        <MeasureLayer
          doc={doc}
          order={["experience", "skills"]}
          contentWidthPx={700}
          onMeasure={onMeasure}
        />,
      );

      expect(onMeasure).toHaveBeenCalledWith("__header", 0);
      expect(onMeasure).toHaveBeenCalledWith("experience", 0);
      expect(onMeasure).toHaveBeenCalledWith("skills", 0);
    } finally {
      restore();
    }
  });

  it("skips measurements when the root has no layout width", () => {
    const restore = mockLayoutWidth(0);

    try {
      const doc = createEmptyResume();
      const onMeasure = vi.fn();

      render(
        <MeasureLayer
          doc={doc}
          order={["experience", "skills"]}
          contentWidthPx={700}
          onMeasure={onMeasure}
        />,
      );

      expect(onMeasure).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});
