import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HorizontalTouchPan } from "./HorizontalTouchPan";

const controls = vi.hoisted(() => ({
  panBy: vi.fn(),
  state: {
    scale: 1,
    positionX: 0,
    positionY: 0,
    previousScale: 1,
  },
}));

vi.mock("react-zoom-pan-pinch", () => ({
  useControls: () => ({ panBy: controls.panBy, state: controls.state }),
}));

const FIT_SCALE = 0.5;

type TouchPoint = { clientX: number; clientY: number };

function touchEvent(
  type: string,
  touches: TouchPoint[],
  cancelable = true,
): Event {
  const event = new Event(type, { bubbles: true, cancelable });

  Object.defineProperty(event, "touches", { value: touches });

  return event;
}

function Harness({ enabled = true }: { enabled?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={hostRef} data-testid="host">
      <HorizontalTouchPan
        hostRef={hostRef}
        fitScale={FIT_SCALE}
        enabled={enabled}
      />
    </div>
  );
}

function renderPan(enabled = true): HTMLElement {
  return render(<Harness enabled={enabled} />).getByTestId("host");
}

beforeEach(() => {
  controls.panBy.mockReset();
  controls.panBy.mockResolvedValue(undefined);
  controls.state.scale = 1;
});

describe("HorizontalTouchPan", () => {
  it("pans the zoomed page with a sideways drag", () => {
    const host = renderPan();

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));

    const allowed = fireEvent(
      host,
      touchEvent("touchmove", [{ clientX: 120, clientY: 104 }]),
    );

    // The default is prevented so the drag cannot turn into a page gesture.
    expect(allowed).toBe(false);
    expect(controls.panBy).toHaveBeenCalledWith(-40, 0, 0);
  });

  it("pans by the movement since the previous touch move", () => {
    const host = renderPan();

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 120, clientY: 104 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 80, clientY: 106 }]));

    expect(controls.panBy).toHaveBeenCalledTimes(2);
    expect(controls.panBy).toHaveBeenLastCalledWith(-40, 0, 0);
  });

  it("leaves vertical drags to the page scroller", () => {
    const host = renderPan();

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));

    const allowed = fireEvent(
      host,
      touchEvent("touchmove", [{ clientX: 164, clientY: 180 }]),
    );

    expect(allowed).toBe(true);
    expect(controls.panBy).not.toHaveBeenCalled();
  });

  it("does not pan while the page still fits", () => {
    controls.state.scale = FIT_SCALE;

    const host = renderPan();

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));

    const allowed = fireEvent(
      host,
      touchEvent("touchmove", [{ clientX: 100, clientY: 102 }]),
    );

    expect(allowed).toBe(true);
    expect(controls.panBy).not.toHaveBeenCalled();
  });

  it("does nothing on fine pointers", () => {
    const host = renderPan(false);

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 100, clientY: 102 }]));

    expect(controls.panBy).not.toHaveBeenCalled();
  });

  it("re-anchors after one finger of a pinch lifts", () => {
    const host = renderPan();

    fireEvent(
      host,
      touchEvent("touchstart", [
        { clientX: 160, clientY: 100 },
        { clientX: 220, clientY: 200 },
      ]),
    );
    fireEvent(host, touchEvent("touchend", [{ clientX: 200, clientY: 200 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: 204 }]));

    expect(controls.panBy).toHaveBeenCalledWith(-40, 0, 0);
  });
});
