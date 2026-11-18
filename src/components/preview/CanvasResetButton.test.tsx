import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CanvasResetButton } from "./CanvasResetButton";

describe("CanvasResetButton", () => {
  it("renders one compact reset control", () => {
    render(<CanvasResetButton onReset={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Reset preview zoom" });

    expect(button).toBeVisible();
    expect(button).toHaveTextContent("Reset");
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("pointer-events-auto");
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
