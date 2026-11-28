import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ACCENT_SWATCHES } from "@/lib/design/designOptions";
import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { resetResumeStore, useResumeStore } from "@/lib/store/useResumeStore";
import { TEMPLATE_LIST } from "@/templates/registry";

import { DesignPanel } from "./DesignPanel";

describe("DesignPanel", () => {
  beforeEach(() => {
    resetResumeStore();
  });

  it("puts paper size, font pairing, and density in one segmented row each", () => {
    render(<DesignPanel />);

    const groups = [
      {
        name: "paper",
        radios: ["page-format-a4", "page-format-letter"],
      },
      {
        name: "fonts",
        radios: [
          "font-pairing-sans",
          "font-pairing-serif",
          "font-pairing-classic",
        ],
      },
      {
        name: "density",
        radios: ["density-compact", "density-normal", "density-relaxed"],
      },
    ] as const;

    for (const group of groups) {
      const row = document.querySelector(
        `[data-segmented-row="${group.name}"]`,
      ) as HTMLElement;

      expect(row).toHaveClass("flex", "gap-0.5", "rounded-lg", "p-0.5");
      // The old tall radio cards are gone: one short row per choice.
      expect(row).not.toHaveClass("grid", "flex-col");

      for (const inputId of group.radios) {
        const input = document.getElementById(inputId) as HTMLInputElement;
        const segment = input.closest("label") as HTMLElement;

        expect(segment.parentElement).toBe(row);
        expect(segment).toHaveAttribute("for", inputId);
        expect(segment).toHaveClass("relative", "min-h-9", "flex-1");
        expect(input).toHaveClass("sr-only");
      }
    }
  });

  it("switches paper size when the Letter segment is clicked", () => {
    render(<DesignPanel />);

    fireEvent.click(screen.getByText("Letter", { exact: true }));

    expect(useResumeStore.getState().doc.metadata.page.format).toBe("letter");
    expect(screen.getByRole("radio", { name: /Letter/ })).toBeChecked();
  });

  it("anchors every option card so a focused hidden radio cannot scroll the page", () => {
    render(<DesignPanel />);

    const radios = screen.getAllByRole("radio");

    expect(radios.length).toBeGreaterThan(0);

    for (const radio of radios) {
      // `sr-only` inputs are absolutely positioned; without a positioned card
      // an ancestor/document scroll can jump the mobile shell on focus.
      expect(radio.closest("label")).toHaveClass("relative");
    }
  });

  it("lists all six templates with an ATS-Safe badge on the single-column ones", () => {
    render(<DesignPanel />);

    const templateRadios = screen
      .getAllByRole("radio")
      .filter(
        (radio) => (radio as HTMLInputElement).name === "resume-template",
      );
    expect(templateRadios).toHaveLength(6);
    expect(screen.getAllByText("ATS-Safe")).toHaveLength(5);
    expect(
      screen.getByText("Human review"),
    ).toBeInTheDocument();

    const input = screen.getByRole("radio", {
      name: /Engineering Classic/,
    }) as HTMLInputElement;
    expect(input).toHaveAttribute("id", "template-onyx");
    expect(input.closest("label")).toHaveAttribute("for", "template-onyx");
    expect(input.closest("label")).toHaveClass("w-full", "min-h-11");
  });

  it("shows a distinct inline wireframe thumbnail on every template card", () => {
    render(<DesignPanel />);

    const thumbs = document.querySelectorAll("[data-template-thumb]");
    expect(thumbs).toHaveLength(TEMPLATE_LIST.length);

    const layouts = new Set<string>();

    for (const template of TEMPLATE_LIST) {
      const thumb = document.querySelector(
        `[data-template-thumb="${template.id}"]`,
      ) as SVGElement;

      expect(thumb).not.toBeNull();
      expect(thumb).toHaveAttribute("aria-hidden", "true");
      expect(thumb).toHaveAttribute("width", "40");
      expect(thumb).toHaveAttribute("height", "54");
      // The thumbnail is the first thing in the card, ahead of the radio.
      expect(thumb.closest("label")?.firstElementChild).toBe(thumb);
      layouts.add(thumb.getAttribute("data-thumb-layout") ?? "");
    }

    // Each layout family gets its own wireframe instead of six identical boxes.
    expect(layouts.size).toBe(TEMPLATE_LIST.length);
    expect(layouts.has("two-column")).toBe(true);
    expect(layouts.has("centered-header")).toBe(true);
  });

  it("puts every template badge in the same top-right title slot", () => {    render(<DesignPanel />);

    const badges = [
      ...screen.getAllByText("ATS-Safe"),
      screen.getByText("Human review"),
    ];

    for (const badge of badges) {
      const row = badge.closest("[data-template-title-row]");
      expect(row).not.toBeNull();
      expect(row).toHaveClass("justify-between");
      expect(badge).toHaveClass("shrink-0", "whitespace-nowrap");
      // The template name wraps inside its own column instead of pushing the
      // badge onto a second line.
      expect(row?.firstElementChild).toHaveClass("min-w-0");
    }
  });

  it("changes the active template when another option is chosen", () => {
    render(<DesignPanel />);

    const studio = screen.getByRole("radio", {
      name: /Studio Sidebar/,
    }) as HTMLInputElement;
    fireEvent.click(studio);

    expect(useResumeStore.getState().doc.metadata.template).toBe("gengar");
    expect(studio).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /Engineering Classic/ }),
    ).not.toBeChecked();
  });

  it("shows the accent swatches and writes the chosen color", () => {
    render(<DesignPanel />);

    const accents = screen
      .getAllByRole("radio")
      .filter((radio) => (radio as HTMLInputElement).name === "accent-color");
    expect(accents).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /^Monochrome/ })).toBeChecked();

    const navy = screen.getByRole("radio", {
      name: /^Navy/,
    }) as HTMLInputElement;
    expect(navy.closest("label")).toHaveAttribute("for", "accent-navy");
    fireEvent.click(navy);

    expect(useResumeStore.getState().doc.metadata.design.colors.primary).toBe(
      "#1b3a57",
    );
    expect(navy).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Monochrome/ })).not.toBeChecked();
  });

  it("marks the active accent with a ring and a checkmark inside its swatch", () => {
    render(<DesignPanel />);

    const monoInput = screen.getByRole("radio", {
      name: /^Monochrome/,
    }) as HTMLInputElement;
    const monoCard = monoInput.closest("label") as HTMLElement;
    const monoDot = monoCard.querySelector("[data-accent-dot]") as HTMLElement;
    const navyInput = screen.getByRole("radio", {
      name: /^Navy/,
    }) as HTMLInputElement;
    const navyCard = navyInput.closest("label") as HTMLElement;
    const navyDot = navyCard.querySelector("[data-accent-dot]") as HTMLElement;

    // The radio stays in the a11y tree but is not drawn beside the color dot.
    expect(monoInput).toHaveClass("sr-only");
    expect(monoDot).toHaveClass("rounded-full", "ring-2", "ring-primary");
    expect(monoCard.querySelector("[data-accent-check]")).not.toBeNull();
    expect(navyDot).not.toHaveClass("ring-2");
    expect(navyCard.querySelector("[data-accent-check]")).toBeNull();

    fireEvent.click(navyInput);

    expect(navyDot).toHaveClass("rounded-full", "ring-2", "ring-primary");
    expect(navyCard.querySelector("[data-accent-check]")).not.toBeNull();
    expect(monoDot).not.toHaveClass("ring-2");
    expect(monoCard.querySelector("[data-accent-check]")).toBeNull();
  });

  it("uses one compact strip of circular swatches with accessible name tooltips", () => {
    render(<DesignPanel />);

    const strip = document.querySelector(
      "[data-accent-strip]",
    ) as HTMLElement;
    // 2×4 mini strip on phones, one row from `sm` up.
    expect(strip).toHaveClass("grid", "grid-cols-4", "sm:grid-cols-8");
    expect(strip).not.toHaveClass("grid-cols-2");
    expect(ACCENT_SWATCHES).toHaveLength(8);

    for (const swatch of ACCENT_SWATCHES) {
      const input = document.getElementById(
        `accent-${swatch.id}`,
      ) as HTMLInputElement;
      const target = input.closest("label") as HTMLElement;
      const dot = target.querySelector("[data-accent-dot]") as HTMLElement;

      expect(target).toHaveClass(
        "relative",
        "rounded-full",
        "h-10",
        "w-10",
        "justify-self-center",
      );
      // A fixed square target keeps the focus ring circular instead of
      // stretching it into an oval across the grid cell.
      expect(target).not.toHaveClass("min-w-0", "flex-1", "w-full");
      expect(target).toHaveAttribute("title", swatch.label);
      expect(input).toHaveAttribute("aria-label", swatch.label);
      expect(dot).toHaveClass("h-7", "w-7", "rounded-full");
      expect(dot).toHaveStyle({ backgroundColor: swatch.hex });
    }
  });

  it("keeps every accent swatch target a fixed square for a circular focus ring", () => {
    render(<DesignPanel />);

    const strip = document.querySelector(
      "[data-accent-strip]",
    ) as HTMLElement;

    for (const swatch of ACCENT_SWATCHES) {
      const input = document.getElementById(
        `accent-${swatch.id}`,
      ) as HTMLInputElement;
      const target = input.closest("label") as HTMLElement;

      // Every cell is a 40px square centred in its grid track, so
      // `focus-within` draws the same crisp circle at every card width.
      expect(target.parentElement).toBe(strip);
      expect(target).toHaveClass("h-10", "w-10", "shrink-0", "justify-self-center");
      expect(target).toHaveClass("focus-within:ring-2", "focus-within:ring-primary");
    }
  });

  it("names the active accent beside the heading and follows the choice", () => {
    render(<DesignPanel />);

    const activeName = document.querySelector(
      "[data-accent-name]",
    ) as HTMLElement;
    expect(activeName).toHaveTextContent("· Monochrome");

    fireEvent.click(screen.getByRole("radio", { name: /^Indigo/ }));

    expect(activeName).toHaveTextContent("· Indigo");
  });

  it("writes both font families when a pairing is chosen", () => {
    render(<DesignPanel />);

    fireEvent.click(screen.getByRole("radio", { name: /^Serif/ }));

    let typography = useResumeStore.getState().doc.metadata.typography;
    expect(typography.body.fontFamily).toBe("var(--font-serif)");
    expect(typography.heading.fontFamily).toBe("var(--font-serif)");

    fireEvent.click(screen.getByRole("radio", { name: /^Classic/ }));

    typography = useResumeStore.getState().doc.metadata.typography;
    expect(typography.body.fontFamily).toBe("var(--font-sans)");
    expect(typography.heading.fontFamily).toBe("var(--font-serif)");
    expect(screen.getByRole("radio", { name: /^Classic/ })).toBeChecked();
  });

  it("previews each font pairing name in its own family", () => {
    render(<DesignPanel />);

    const sans = screen.getByText("Sans");
    const serif = screen.getByText("Serif");
    const classic = screen.getByText("Classic");

    expect(sans).toHaveStyle({ fontFamily: "var(--font-sans)" });
    expect(serif).toHaveStyle({ fontFamily: "var(--font-serif)" });
    expect(classic).toHaveStyle({ fontFamily: "var(--font-serif)" });

    // The explicit class is what keeps `Sans` out of the serif heading face
    // even if the inline family is not applied while the panel renders.
    expect(sans).toHaveClass("font-sans");
    expect(sans).not.toHaveClass("font-serif");
    expect(serif).toHaveClass("font-serif");
    expect(classic).toHaveClass("font-serif");
  });

  it("records the density choice and applies its spacing", () => {
    render(<DesignPanel />);

    // "Compact 1-Pager" is also a template, so target the density radio by id.
    const compact = document.getElementById("density-compact") as HTMLInputElement;
    expect(compact.closest("label")).toHaveAttribute("for", "density-compact");
    fireEvent.click(compact);

    let doc = useResumeStore.getState().doc;
    expect(doc.metadata.design.density).toBe("compact");
    expect(doc.metadata.page.gapX).toBe(5);
    expect(doc.metadata.page.gapY).toBe(8);
    expect(doc.metadata.typography.body.lineHeight).toBe(1.25);
    expect(compact).toBeChecked();

    fireEvent.click(
      document.getElementById("density-relaxed") as HTMLInputElement,
    );

    doc = useResumeStore.getState().doc;
    expect(doc.metadata.design.density).toBe("relaxed");
    expect(doc.metadata.page.gapX).toBe(11);
    expect(doc.metadata.page.gapY).toBe(16);
    expect(doc.metadata.typography.body.lineHeight).toBe(1.55);
  });

  it("gives the active density segment a solid fill", () => {
    render(<DesignPanel />);

    const normalCard = document
      .getElementById("density-normal")!
      .closest("label") as HTMLElement;
    expect(normalCard).toHaveClass("bg-primary", "text-white");

    const compact = document.getElementById(
      "density-compact",
    ) as HTMLInputElement;
    fireEvent.click(compact);

    const compactCard = compact.closest("label") as HTMLElement;
    expect(compactCard).toHaveClass("bg-primary", "text-white", "shadow-sm");
    expect(normalCard).not.toHaveClass("bg-primary");
  });

  it("lights up a density preset for legacy docs without a stored density", () => {
    const legacy = createEmptyResume();
    // Saved rows from before `design.density` existed have no enum value.
    const doc = {
      ...legacy,
      metadata: {
        ...legacy.metadata,
        design: { ...legacy.metadata.design, density: undefined },
        page: { ...legacy.metadata.page, gapX: 5, gapY: 8 },
        typography: {
          ...legacy.metadata.typography,
          body: { ...legacy.metadata.typography.body, lineHeight: 1.25 },
        },
      },
    } as unknown as ResumeDocument;
    useResumeStore.setState({ doc });

    render(<DesignPanel />);

    expect(document.getElementById("density-compact")).toBeChecked();
    expect(document.getElementById("density-normal")).not.toBeChecked();
    expect(document.getElementById("density-relaxed")).not.toBeChecked();
  });
});
