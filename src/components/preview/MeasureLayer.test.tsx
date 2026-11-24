import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { encodeEntryBlock } from "@/lib/pagination/blockIds";
import {
  getSectionPlans,
  planFragmentKeys,
} from "@/lib/pagination/sectionPlans";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  ExperienceItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";
import { fullWidthMeasureId } from "@/templates/studio/sidebarSections";

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

  it("measures bullet fragments for a single tall entry", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume();
      doc.sections.experience.items = [
        ExperienceItemSchema.parse({
          id: "e1",
          company: "Acme",
          position: "Engineer",
          summary:
            "<ul><li><p>One</p></li><li><p>Two</p></li><li><p>Three</p></li></ul>",
        }),
      ];
      const [plan] = getSectionPlans(doc, ["experience"]);
      const fragments = planFragmentKeys(plan);
      const onMeasure = vi.fn();

      render(
        <MeasureLayer
          doc={doc}
          order={["experience"]}
          contentWidthPx={700}
          onMeasure={onMeasure}
        />,
      );

      // The atomic whole-entry block is still measured for the normal case…
      expect(onMeasure).toHaveBeenCalledWith("experience", 0);
      // …and each bullet reports so packing can split at a page boundary.
      for (const key of fragments) {
        expect(onMeasure).toHaveBeenCalledWith(key, 0);
      }
      expect(fragments).toHaveLength(3);
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
      const content = root.firstElementChild as HTMLElement;

      expect(content.style.fontSize).toBe("5.5pt");
      expect(content.style.getPropertyValue("--resume-font-size")).toBe("5.5pt");
      expect(content.style.getPropertyValue("--resume-fit-scale")).toBe("0.5");
    } finally {
      restore();
    }
  });

  it("applies the active template root class and theme variables", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume("chikorita");
      doc.metadata.typography.body.fontSize = 12;
      doc.metadata.typography.heading.fontFamily = "var(--font-serif)";
      doc.metadata.page.gapY = 8;
      doc.metadata.page.gapX = 5;
      doc.metadata.design.colors.primary = "#123456";

      const { container } = render(
        <MeasureLayer
          doc={doc}
          order={["experience"]}
          contentWidthPx={700}
          onMeasure={vi.fn()}
        />,
      );
      const content = container.firstElementChild
        ?.firstElementChild as HTMLElement;

      // The Compact 1-Pager variant tightens section spacing; measuring it as
      // plain Onyx would report a taller document than the preview renders.
      expect(content).toHaveClass("onyx", "onyx--compact");
      expect(content.style.fontSize).toBe("12pt");
      expect(content.style.getPropertyValue("--page-gap-y")).toBe("8pt");
      expect(content.style.getPropertyValue("--page-gap-x")).toBe("5pt");
      expect(content.style.getPropertyValue("--resume-heading-font")).toBe(
        "var(--font-serif)",
      );
      expect(content.style.getPropertyValue("--brand-primary")).toBe("#123456");
      expect(content.style.getPropertyValue("--page-margin-x")).toBe("14pt");
    } finally {
      restore();
    }
  });

  it("measures main and sidebar Studio blocks in their columns and full width", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume("gengar");
      doc.sections.experience.items = [
        ExperienceItemSchema.parse({
          id: "e1",
          company: "Acme",
          position: "Engineer",
        }),
      ];
      doc.sections.skills.items = [
        SkillItemSchema.parse({
          id: "s1",
          name: "Languages",
          keywords: ["TypeScript"],
        }),
      ];
      const onMeasure = vi.fn();

      const { container } = render(
        <MeasureLayer
          doc={doc}
          order={["experience", "skills"]}
          contentWidthPx={700}
          onMeasure={onMeasure}
        />,
      );
      const content = container.firstElementChild
        ?.firstElementChild as HTMLElement;
      const layout = content.querySelector(".studio-layout");
      const main = content.querySelector(".studio-main");
      const sidebar = content.querySelector(".studio-sidebar");

      // The Studio main column is ~63% of the page width. Measuring it at the
      // full content width under-reports line wraps, which is how a compact
      // resume reported one page while clipping Projects/Education.
      expect(content).toHaveClass("onyx", "onyx--studio");
      expect(layout).not.toBeNull();
      expect(layout).not.toHaveClass("studio-layout--full");
      expect(
        main?.querySelector('[data-measure-id="experience"]'),
      ).not.toBeNull();
      expect(
        sidebar?.querySelector('[data-measure-id="skills"]'),
      ).not.toBeNull();
      expect(
        main?.querySelector('[data-measure-id="skills"]'),
      ).toBeNull();
      // Page 2+ collapses the grid, so every block that lands there renders
      // full-width. Both main and sidebar blocks report that second copy.
      const fullWidthGroup = content.querySelector("[data-measure-full-width]");
      const fullWidthExperience = content.querySelector(
        `[data-measure-id="${fullWidthMeasureId("experience")}"]`,
      );
      const fullWidthSkills = content.querySelector(
        `[data-measure-id="${fullWidthMeasureId("skills")}"]`,
      );

      expect(fullWidthExperience).not.toBeNull();
      expect(fullWidthSkills).not.toBeNull();
      expect(fullWidthGroup).toContainElement(
        fullWidthExperience as HTMLElement,
      );
      expect(fullWidthGroup).toContainElement(fullWidthSkills as HTMLElement);
      expect(onMeasure).toHaveBeenCalledWith("experience", 0);
      expect(onMeasure).toHaveBeenCalledWith("skills", 0);
      expect(onMeasure).toHaveBeenCalledWith(
        fullWidthMeasureId("experience"),
        0,
      );
      expect(
        onMeasure,
      ).toHaveBeenCalledWith(fullWidthMeasureId("skills"), 0);
    } finally {
      restore();
    }
  });

  it("collapses Studio to one full-width column when no sidebar content renders", () => {
    const restore = mockLayoutWidth(700);

    try {
      const doc = createEmptyResume("gengar");
      doc.sections.experience.items = [
        ExperienceItemSchema.parse({
          id: "e1",
          company: "Acme",
          position: "Engineer",
        }),
      ];
      const onMeasure = vi.fn();

      const { container } = render(
        <MeasureLayer
          doc={doc}
          order={["experience", "skills"]}
          contentWidthPx={700}
          onMeasure={onMeasure}
        />,
      );
      const content = container.firstElementChild
        ?.firstElementChild as HTMLElement;
      const layout = content.querySelector(".studio-layout");

      expect(layout).toHaveClass("studio-layout--full");
      expect(content.querySelector(".studio-sidebar")).toBeNull();
      // An empty sidebar plan must still report zero, otherwise pagination
      // waits for a measurement that never arrives.
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
