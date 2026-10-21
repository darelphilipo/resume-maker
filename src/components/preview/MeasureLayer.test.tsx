import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import { MeasureLayer } from "./MeasureLayer";

describe("MeasureLayer", () => {
  it("reports zero heights so hidden sections clear stale measurements", () => {
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
  });
});
