import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasResetButton, RESET_ANIMATION_MS } from "./CanvasResetButton";

const controls = vi.hoisted(() => ({
  setTransform: vi.fn(),
  zoomed: false,
}));

vi.mock("react-zoom-pan-pinch", () => ({
  useControls: () => ({ setTransform: controls.setTransform }),
  useTransformComponent: () => controls.zoomed,
}));

const FIT_SCALE = 0.5;

function renderReset() {
  return render(<CanvasResetButton fitScale={FIT_SCALE} />);
}

beforeEach(() => {
  controls.setTransform.mockReset();
  controls.zoomed = false;
});

describe("CanvasResetButton", () => {
  it("stays hidden while the page fits, so no toolbar covers the resume", () => {
    renderReset();

    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();
  });

  it("appears as one compact reset control once zoomed", () => {
    controls.zoomed = true;

    renderReset();

    const button = screen.getByRole("button", { name: "Reset preview zoom" });

    expect(button).toBeVisible();
    expect(button).toHaveTextContent("Reset");
    expect(button.className).toContain("rounded-full");
    expect(button.className).toContain("pointer-events-auto");
  });

  it("returns to the fit scale and origin", () => {
    controls.zoomed = true;

    renderReset();

    fireEvent.click(
      screen.getByRole("button", { name: "Reset preview zoom" }),
    );

    expect(controls.setTransform).toHaveBeenCalledWith(
      0,
      0,
      FIT_SCALE,
      RESET_ANIMATION_MS,
    );
  });
});
