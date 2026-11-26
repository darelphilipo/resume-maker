import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { TEMPLATE_IDS } from "@/lib/schema/resume.schema";

import { getTemplate, TEMPLATES, TEMPLATE_LIST } from "./registry";
import { templateRootClassName } from "./shared/templateRoot";

describe("template registry", () => {
  it("registers every schema template id with a renderer", () => {
    expect(TEMPLATE_IDS).toHaveLength(6);

    for (const id of TEMPLATE_IDS) {
      const definition = getTemplate(id);
      expect(definition.id, id).toBe(id);
      expect(typeof definition.Component, id).toBe("function");
      expect(TEMPLATES[id], id).toBe(definition);
    }
  });

  it("lists all six options in a stable, single-column-first order", () => {
    expect(TEMPLATE_LIST.map((template) => template.id)).toEqual([
      "onyx",
      "persian",
      "bronzor",
      "chikorita",
      "azurill",
      "gengar",
    ]);
    expect(TEMPLATE_LIST.every((template) => template.columns === 1)).toBe(
      false,
    );
    expect(TEMPLATE_LIST.slice(0, 5).every((t) => t.columns === 1)).toBe(true);
  });

  it("names the six layouts in user language", () => {
    expect(TEMPLATE_LIST.map((template) => template.label)).toEqual([
      "Engineering Classic (Jake)",
      "Ivy/Executive (Harvard)",
      "Modern Accent",
      "Compact 1-Pager",
      "Hybrid Skills-First",
      "Studio Sidebar",
    ]);
  });

  it("marks the five single-column options ATS-Safe", () => {
    for (const template of TEMPLATE_LIST) {
      expect(template.atsSafe, template.id).toBe(template.columns === 1);
    }

    const studio = getTemplate("gengar");
    expect(studio.columns).toBe(2);
    expect(studio.atsSafe).toBe(false);
    expect(studio.badge).toBe("Human review");
  });

  it("keeps the measure-layer root class in sync with every template", () => {
    for (const definition of TEMPLATE_LIST) {
      const { container, unmount } = render(
        <definition.Component
          doc={createEmptyResume(definition.id)}
          pages={[[]]}
          pageIndex={0}
        />,
      );
      const root = container.firstElementChild as HTMLElement;

      // The measure layer uses `templateRootClassName`; a variant that adds a
      // different root class would be measured with the wrong CSS.
      expect(root, definition.id).toHaveClass(
        ...templateRootClassName(definition.id).split(" "),
      );
      unmount();
    }
  });

  it("renders a section through every registered template", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    doc.summary.content = "<p>Summary body</p>";

    for (const definition of TEMPLATE_LIST) {
      const { unmount } = render(
        <definition.Component
          doc={doc}
          pages={[["__header", "summary"]]}
          pageIndex={0}
        />,
      );

      expect(
        screen.getByRole("heading", { level: 1, name: "Ada Lovelace" }),
        definition.id,
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 2, name: "Summary" }),
        definition.id,
      ).toBeInTheDocument();
      unmount();
    }
  });
});
