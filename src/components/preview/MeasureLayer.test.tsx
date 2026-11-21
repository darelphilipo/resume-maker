import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { encodeEntryBlock } from "@/lib/pagination/blockIds";
import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

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

  it("contains the measuring column in a fixed 0x0 overflow-hidden shell", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume();
      const onMeasure = vi.fn();

      const { container } = render(
        <MeasureLayer
          doc={doc}
          order={["experience"]}
          contentWidthPx={700}
          onMeasure={onMeasure}
        />,
      );
      const root = container.firstElementChild as HTMLElement;
      const content = root.firstElementChild as HTMLElement;

      // The off-screen shell can never add document height or a scroll range,
      // even while a design change re-measures a tall resume.
      expect(root.style.position).toBe("fixed");
      expect(root.style.width).toBe("0px");
      expect(root.style.height).toBe("0px");
      expect(root.style.overflow).toBe("hidden");
      expect(root.style.pointerEvents).toBe("none");

      // The inner column keeps the real measuring width and Onyx typography.
      expect(content).toHaveClass("onyx");
      expect(content.style.width).toBe("700px");
      expect(onMeasure).toHaveBeenCalledWith("__header", 0);
    } finally {
      restore();
    }
  });

  it("measures each entry of a multi-entry section separately", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume();
      doc.sections.experience.items = [
        ExperienceItemSchema.parse({
          id: "e1",
          company: "Acme",
          position: "Engineer",
        }),
        ExperienceItemSchema.parse({
          id: "e2",
          company: "Globex",
          position: "Manager",
        }),
      ];
      const onMeasure = vi.fn();

      render(
        <MeasureLayer
          doc={doc}
          order={["experience"]}
          contentWidthPx={700}
          onMeasure={onMeasure}
        />,
      );

      expect(onMeasure).toHaveBeenCalledWith("__header", 0);
      expect(onMeasure).toHaveBeenCalledWith(
        encodeEntryBlock("experience", "e1", true),
        0,
      );
      expect(onMeasure).toHaveBeenCalledWith(
        encodeEntryBlock("experience", "e2", false),
        0,
      );
      expect(onMeasure).not.toHaveBeenCalledWith("experience", 0);
    } finally {
      restore();
    }
  });

  it("scales its measuring typography with the fit scale", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume();
      doc.metadata.page.fitScale = 0.5;

      const { container } = render(
        <MeasureLayer
          doc={doc}
          order={["experience"]}
          contentWidthPx={700}
          onMeasure={vi.fn()}
        />,
      );
      const root = container.firstElementChild as HTMLElement;

      expect(root.style.fontSize).toBe("5.5pt");
      expect(root.style.getPropertyValue("--resume-font-size")).toBe("5.5pt");
      expect(root.style.getPropertyValue("--resume-fit-scale")).toBe("0.5");
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
