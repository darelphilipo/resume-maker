import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CanvasZoomControls } from "./CanvasZoomControls";

function renderControls(
  overrides: Partial<Parameters<typeof CanvasZoomControls>[0]> = {},
) {
  const props = {
    percent: 100,
    zoomed: false,
    canZoomIn: true,
    canZoomOut: false,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };

  render(<CanvasZoomControls {...props} />);

  return props;
}

describe("CanvasZoomControls", () => {
  it("stays a floating desktop-only pill, not a toolbar row", () => {
    renderControls();

    const wrapper = document.querySelector<HTMLElement>(
      "[data-canvas-zoom-controls]",
    );

    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass(
      "absolute",
      "bottom-3",
      "right-3",
      "z-20",
      "pointer-events-none",
      "hidden",
      "lg:flex",
    );
    expect(screen.getByRole("group", { name: "Preview zoom" })).toBeVisible();
  });

  it("shows the fitted zoom and disables zooming out at 100%", () => {
    renderControls();

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Reset zoom to fit" }),
    ).not.toBeInTheDocument();
  });

  it("calls the zoom handlers and reveals Reset once zoomed", () => {
    const props = renderControls({
      percent: 150,
      zoomed: true,
      canZoomOut: true,
    });

    expect(screen.getByText("150%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom to fit" }));

    expect(props.onZoomIn).toHaveBeenCalledTimes(1);
    expect(props.onZoomOut).toHaveBeenCalledTimes(1);
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it("disables zoom in at the maximum scale", () => {
    renderControls({ percent: 200, canZoomIn: false });

    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
  });

  it("keeps the zoom buttons anchored when Reset appears", () => {
    const { rerender } = render(
      <CanvasZoomControls
        percent={100}
        zoomed={false}
        canZoomIn
        canZoomOut={false}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const readout = screen.getByText("100%");

    expect(readout).toHaveClass("min-w-[3rem]", "tabular-nums");

    rerender(
      <CanvasZoomControls
        percent={125}
        zoomed
        canZoomIn
        canZoomOut
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const group = screen.getByRole("group", { name: "Preview zoom" });
    const names = Array.from(group.querySelectorAll("button")).map(
      (button) => button.getAttribute("aria-label"),
    );

    // Reset grows the right-anchored pill from the left, so `[- | % | +]` keeps
    // its exact x-position between clicks (a second `+` cannot hit Reset).
    expect(names).toEqual([
      "Reset zoom to fit",
      "Zoom out",
      "Zoom in",
    ]);
    expect(screen.getByText("125%")).toHaveClass("min-w-[3rem]", "tabular-nums");
  });
});
