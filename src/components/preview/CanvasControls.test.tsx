import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CanvasControls,
  CONTROL_ANIMATION_MS,
  PAN_STEP_PX,
  ZOOM_STEP_FACTOR,
} from "./CanvasControls";

const controls = vi.hoisted(() => ({
  centerView: vi.fn(),
  panBy: vi.fn(),
  setTransform: vi.fn(),
  state: { scale: 1, positionX: 0, positionY: 0, previousScale: 1 },
  zoomPercent: 100,
}));

vi.mock("react-zoom-pan-pinch", () => ({
  useControls: () => ({
    centerView: controls.centerView,
    panBy: controls.panBy,
    setTransform: controls.setTransform,
    state: controls.state,
  }),
  useTransformComponent: () => controls.zoomPercent,
}));

const FIT_SCALE = 0.5;

function renderControls() {
  return render(
    <CanvasControls fitScale={FIT_SCALE} minScale={0.2} maxScale={2} />,
  );
}

function button(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

beforeEach(() => {
  controls.centerView.mockReset();
  controls.panBy.mockReset();
  controls.setTransform.mockReset();
  controls.state.scale = 1;
  controls.zoomPercent = 100;
});

describe("CanvasControls", () => {
  it("is available on phones instead of being desktop-only", () => {
    renderControls();

    const zoomGroup = screen.getByRole("group", { name: "Preview zoom" });

    expect(zoomGroup.parentElement?.className).toContain("flex");
    expect(zoomGroup.parentElement?.className).not.toMatch(/\bhidden\b/);
    expect(screen.getByRole("group", { name: "Move preview" })).toBeVisible();
  });

  it("shows the current zoom level", () => {
    controls.zoomPercent = 65;

    renderControls();

    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("zooms in and out in multiplicative steps", () => {
    renderControls();

    fireEvent.click(button("Zoom in"));
    fireEvent.click(button("Zoom out"));

    const zoomInScale = controls.centerView.mock.calls[0][0] as number;
    const zoomOutScale = controls.centerView.mock.calls[1][0] as number;

    expect(zoomInScale).toBeCloseTo(1 * ZOOM_STEP_FACTOR, 6);
    expect(zoomOutScale).toBeCloseTo(1 / ZOOM_STEP_FACTOR, 6);
    expect(controls.centerView.mock.calls[0][1]).toBe(CONTROL_ANIMATION_MS);
    expect(controls.centerView.mock.calls[0][2]).toBe("easeOut");
  });

  it("clamps button zoom to the configured range", () => {
    controls.state.scale = 2;
    renderControls();

    fireEvent.click(button("Zoom in"));
    expect(controls.centerView.mock.calls[0][0]).toBe(2);

    controls.state.scale = 0.2;
    fireEvent.click(button("Zoom out"));
    expect(controls.centerView.mock.calls[1][0]).toBe(0.2);
  });

  it("returns to the fit scale and origin", () => {
    renderControls();

    fireEvent.click(button("Fit preview to width"));

    expect(controls.setTransform).toHaveBeenCalledWith(
      0,
      0,
      FIT_SCALE,
      CONTROL_ANIMATION_MS,
    );
  });

  it("nudges the canvas with the movement buttons when zoomed in", () => {
    controls.state.scale = 1.2;

    renderControls();

    fireEvent.click(button("Move preview left"));
    fireEvent.click(button("Move preview up"));
    fireEvent.click(button("Move preview down"));
    fireEvent.click(button("Move preview right"));

    expect(controls.panBy.mock.calls).toEqual([
      [-PAN_STEP_PX, 0, CONTROL_ANIMATION_MS, "easeOut"],
      [0, -PAN_STEP_PX, CONTROL_ANIMATION_MS, "easeOut"],
      [0, PAN_STEP_PX, CONTROL_ANIMATION_MS, "easeOut"],
      [PAN_STEP_PX, 0, CONTROL_ANIMATION_MS, "easeOut"],
    ]);
  });

  it("disables movement while the whole page is already visible", () => {
    controls.state.scale = FIT_SCALE;

    renderControls();

    for (const name of [
      "Move preview left",
      "Move preview up",
      "Move preview down",
      "Move preview right",
    ]) {
      expect(button(name)).toBeDisabled();
    }
  });
});
