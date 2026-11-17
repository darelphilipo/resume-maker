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
});
