import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CanvasResetButton, CanvasResetOverlay } from "./CanvasResetButton";

describe("CanvasResetButton", () => {
  it("renders one compact reset control", () => {
    render(<CanvasResetButton onReset={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Reset preview zoom" });

    expect(button).toBeVisible();
    expect(button).toHaveTextContent("Reset");
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("pointer-events-auto");
    // Compact pill so it stays small while floating over the paper.
    expect(button).toHaveClass("h-8", "text-xs", "px-2.5");
  });

  it("calls the reset handler", () => {
    const onReset = vi.fn();

    render(<CanvasResetButton onReset={onReset} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Reset preview zoom" }),
    );

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("CanvasResetOverlay", () => {
  it("stays out of the preview until the canvas is zoomed", () => {
    render(<CanvasResetOverlay visible={false} onReset={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector("[data-canvas-reset]")).toBeNull();
  });

  it("floats a bottom-right pill without blocking canvas gestures", () => {
    render(<CanvasResetOverlay visible onReset={vi.fn()} />);

    const overlay = document.querySelector<HTMLElement>("[data-canvas-reset]");

    expect(overlay).not.toBeNull();
    // The overlay stays pointer-transparent; the pill itself takes the tap.
    expect(overlay).toHaveClass(
      "absolute",
      "bottom-3",
      "right-3",
      "z-20",
      "pointer-events-none",
    );
    expect(overlay).toContainElement(
      screen.getByRole("button", { name: "Reset preview zoom" }),
    );
  });

  it("resets from the floating pill", () => {
    const onReset = vi.fn();

    render(<CanvasResetOverlay visible onReset={onReset} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Reset preview zoom" }),
    );

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
