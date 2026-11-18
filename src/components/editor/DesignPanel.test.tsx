import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

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
});
