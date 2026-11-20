import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ACCENT_SWATCHES } from "@/lib/design/designOptions";
import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { resetResumeStore, useResumeStore } from "@/lib/store/useResumeStore";

import { DesignPanel } from "./DesignPanel";

describe("DesignPanel", () => {
  beforeEach(() => {
    resetResumeStore();
  });

  it("pairs each paper-size card with its radio and fills the card width", () => {
    render(<DesignPanel />);

    const a4 = screen.getByRole("radio", { name: /A4/ }) as HTMLInputElement;
    const letter = screen.getByRole("radio", {
      name: /Letter/,
    }) as HTMLInputElement;

    for (const [input, inputId] of [
      [a4, "page-format-a4"],
      [letter, "page-format-letter"],
    ] as const) {
      expect(input).toHaveAttribute("id", inputId);
      expect(input.closest("label")).toHaveAttribute("for", inputId);
      expect(input.closest("label")).toHaveClass("w-full");
    }
  });

  it("switches paper size when the Letter card body is clicked", () => {
    render(<DesignPanel />);

    // Click the detail text, not the radio dot: the whole label is the target.
    fireEvent.click(screen.getByText("8.5 × 11 in"));

    expect(useResumeStore.getState().doc.metadata.page.format).toBe("letter");
    expect(screen.getByRole("radio", { name: /Letter/ })).toBeChecked();
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
      screen.getByText("Best for direct/human review"),
    ).toBeInTheDocument();

    const input = screen.getByRole("radio", {
      name: /Engineering Classic/,
    }) as HTMLInputElement;
    expect(input).toHaveAttribute("id", "template-onyx");
    expect(input.closest("label")).toHaveAttribute("for", "template-onyx");
    expect(input.closest("label")).toHaveClass("w-full", "min-h-11");
  });

  it("puts every template badge in the same top-right title slot", () => {
    render(<DesignPanel />);

    const badges = [
      ...screen.getAllByText("ATS-Safe"),
      screen.getByText("Best for direct/human review"),
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

  it("marks the active accent with a border, fill, and checkmark instead of a radio dot", () => {
    render(<DesignPanel />);

    const monoInput = screen.getByRole("radio", {
      name: /^Monochrome/,
    }) as HTMLInputElement;
    const monoCard = monoInput.closest("label") as HTMLElement;
    const navyInput = screen.getByRole("radio", {
      name: /^Navy/,
    }) as HTMLInputElement;
    const navyCard = navyInput.closest("label") as HTMLElement;

    // The radio stays in the a11y tree but is not drawn beside the color dot.
    expect(monoInput).toHaveClass("sr-only");
    expect(monoCard).toHaveClass("border-primary", "bg-primary/10");
    expect(monoCard.querySelector("[data-accent-check]")).not.toBeNull();
    expect(navyCard).not.toHaveClass("border-primary");
    expect(navyCard.querySelector("[data-accent-check]")).toBeNull();

    fireEvent.click(navyInput);

    expect(navyCard).toHaveClass("border-primary", "bg-primary/10");
    expect(navyCard.querySelector("[data-accent-check]")).not.toBeNull();
    expect(monoCard.querySelector("[data-accent-check]")).toBeNull();
  });

  it("keeps every accent name readable in a two-column swatch grid", () => {
    render(<DesignPanel />);

    const mono = document.getElementById("accent-mono");
    const grid = mono?.closest("label")?.parentElement;
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid).not.toHaveClass("sm:grid-cols-3");

    for (const swatch of ACCENT_SWATCHES) {
      const input = document.getElementById(`accent-${swatch.id}`);
      const card = input?.closest("label");
      const name = screen.getByText(swatch.label);

      expect(card).toHaveClass("w-full", "min-h-11", "flex-wrap");
      expect(card).toContainElement(name);
      expect(name).toHaveClass("w-full", "whitespace-nowrap");
      expect(name).not.toHaveClass("truncate");
    }

    // Eight swatches fill four complete rows, so no card is left orphaned.
    expect(ACCENT_SWATCHES.length % 2).toBe(0);
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

    expect(screen.getByText("Sans")).toHaveStyle({
      fontFamily: "var(--font-sans)",
    });
    expect(screen.getByText("Serif")).toHaveStyle({
      fontFamily: "var(--font-serif)",
    });
    expect(screen.getByText("Classic")).toHaveStyle({
      fontFamily: "var(--font-serif)",
    });
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

  it("gives the active density card a solid border and fill", () => {
    render(<DesignPanel />);

    const normalCard = document
      .getElementById("density-normal")!
      .closest("label") as HTMLElement;
    expect(normalCard).toHaveClass("border-primary", "bg-primary/10");

    const compact = document.getElementById(
      "density-compact",
    ) as HTMLInputElement;
    fireEvent.click(compact);

    const compactCard = compact.closest("label") as HTMLElement;
    expect(compactCard).toHaveClass("border-primary", "bg-primary/10", "ring-1");
    expect(normalCard).not.toHaveClass("border-primary");
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
