import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const controls = vi.hoisted(() => ({ setTransform: vi.fn() }));

vi.mock("react-zoom-pan-pinch", () => ({
  // The real hook rebuilds its control closures on every render, so the mocked
  // identity must change too or the regression would be invisible.
  useControls: () => ({
    setTransform: (...args: unknown[]) => controls.setTransform(...args),
  }),
}));

import { useFitTransform } from "./useFitTransform";

function Harness({ fitScale, tick = 0 }: { fitScale: number; tick?: number }) {
  useFitTransform(fitScale);

  return <span data-testid="tick">{tick}</span>;
}

beforeEach(() => {
  controls.setTransform.mockReset();
  controls.setTransform.mockResolvedValue(undefined);
});

describe("useFitTransform", () => {
  it("fits the canvas once on mount", () => {
    render(<Harness fitScale={0.42} />);

    expect(controls.setTransform).toHaveBeenCalledTimes(1);
    expect(controls.setTransform).toHaveBeenCalledWith(0, 0, 0.42, 0);
  });

  it("does not re-fit when an unrelated render hands back a new setTransform", () => {
    const view = render(<Harness fitScale={0.42} tick={0} />);

    controls.setTransform.mockClear();

    // This is the pinch regression: a re-render (the zoomed bit flipping) used
    // to re-apply the fit transform and snap the canvas back to fit mid-gesture.
    view.rerender(<Harness fitScale={0.42} tick={1} />);
    view.rerender(<Harness fitScale={0.42} tick={2} />);

    expect(controls.setTransform).not.toHaveBeenCalled();
  });

  it("re-fits when the fitted scale changes", () => {
    const view = render(<Harness fitScale={0.42} />);

    controls.setTransform.mockClear();
    view.rerender(<Harness fitScale={0.55} />);

    expect(controls.setTransform).toHaveBeenCalledTimes(1);
    expect(controls.setTransform).toHaveBeenCalledWith(0, 0, 0.55, 0);
  });

  it("ignores a non-finite fit scale", () => {
    render(<Harness fitScale={Number.NaN} />);

    expect(controls.setTransform).not.toHaveBeenCalled();
  });
});
