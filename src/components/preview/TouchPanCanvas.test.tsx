import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TouchPanCanvas } from "./TouchPanCanvas";

const controls = vi.hoisted(() => {
  const state = {
    scale: 1,
    positionX: 0,
    positionY: -100,
    previousScale: 1,
  };

  return {
    panBy: vi.fn(),
    state,
    instance: {
      state,
      bounds: { minPositionY: -400, maxPositionY: 0 } as {
        minPositionY: number;
        maxPositionY: number;
      } | null,
    },
  };
});

vi.mock("react-zoom-pan-pinch", () => ({
  useControls: () => ({
    panBy: controls.panBy,
    state: controls.state,
    instance: controls.instance,
  }),
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

function Harness({
  enabled = true,
  isZoomed = true,
}: {
  enabled?: boolean;
  isZoomed?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={hostRef} data-testid="host">
      <TouchPanCanvas
        hostRef={hostRef}
        scrollRef={scrollRef}
        fitScale={FIT_SCALE}
        isZoomed={isZoomed}
        enabled={enabled}
      />
    </div>
  );
}

/**
 * A tablet-shaped fallback: the preview panel is the scrolling *ancestor* of
 * the touch host, and `[data-canvas-scroll]` does not scroll at `lg`.
 */
function ScrollableHarness({ isZoomed = true }: { isZoomed?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      data-testid="scroller"
      style={{ overflowY: "auto", height: "200px" }}
    >
      <div ref={hostRef} data-testid="host">
        <TouchPanCanvas
          hostRef={hostRef}
          scrollRef={scrollRef}
          fitScale={FIT_SCALE}
          isZoomed={isZoomed}
          enabled
        />
      </div>
    </div>
  );
}

/**
 * The phone shape: `[data-canvas-scroll]` is a *descendant* of the touch host,
 * so only the explicit `scrollRef` can reach the paper scroller.
 */
function PaperScrollerHarness({ isZoomed = true }: { isZoomed?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={hostRef} data-testid="host">
      <div
        ref={scrollRef}
        data-testid="scroller"
        style={{ overflowY: "auto", height: "200px" }}
      >
        <div data-testid="paper" />
      </div>
      <TouchPanCanvas
        hostRef={hostRef}
        scrollRef={scrollRef}
        fitScale={FIT_SCALE}
        isZoomed={isZoomed}
        enabled
      />
    </div>
  );
}

function renderPan(enabled = true, isZoomed = true): HTMLElement {
  return render(<Harness enabled={enabled} isZoomed={isZoomed} />).getByTestId(
    "host",
  );
}

function stubScrollGeometry(scroller: HTMLElement): void {
  Object.defineProperty(scroller, "clientHeight", {
    value: 200,
    configurable: true,
  });
  Object.defineProperty(scroller, "scrollHeight", {
    value: 800,
    configurable: true,
  });
}

function renderPanInScroller(isZoomed = true): {
  host: HTMLElement;
  scroller: HTMLElement;
} {
  const view = render(<ScrollableHarness isZoomed={isZoomed} />);
  const scroller = view.getByTestId("scroller");

  stubScrollGeometry(scroller);

  return { host: view.getByTestId("host"), scroller };
}

function renderPanOnPaperScroller(isZoomed = true): {
  host: HTMLElement;
  scroller: HTMLElement;
} {
  const view = render(<PaperScrollerHarness isZoomed={isZoomed} />);
  const scroller = view.getByTestId("scroller");

  stubScrollGeometry(scroller);

  return { host: view.getByTestId("host"), scroller };
}

beforeEach(() => {
  controls.panBy.mockReset();
  controls.panBy.mockResolvedValue(undefined);
  controls.state.scale = 1;
  controls.state.positionY = -100;
  controls.instance.bounds = { minPositionY: -400, maxPositionY: 0 };
});

describe("TouchPanCanvas", () => {
  it("pans the zoomed page freely on both axes", () => {
    const host = renderPan();

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 160 }]));

    const allowed = fireEvent(
      host,
      touchEvent("touchmove", [{ clientX: 120, clientY: 100 }]),
    );

    // The default is prevented so the drag cannot turn into a page gesture.
    expect(allowed).toBe(false);
    expect(controls.panBy).toHaveBeenCalledWith(-40, -60, 0);
  });

  it("pans by the movement since the previous touch move", () => {
    const host = renderPan();

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 120, clientY: 80 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 80, clientY: 50 }]));

    expect(controls.panBy).toHaveBeenCalledTimes(2);
    expect(controls.panBy).toHaveBeenLastCalledWith(-40, -30, 0);
  });

  it("waits for the touch slop before the first pan", () => {
    const host = renderPan();

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 164, clientY: 102 }]));

    expect(controls.panBy).not.toHaveBeenCalled();

    fireEvent(host, touchEvent("touchmove", [{ clientX: 176, clientY: 100 }]));

    expect(controls.panBy).toHaveBeenCalledTimes(1);
    expect(controls.panBy).toHaveBeenCalledWith(16, 0, 0);
  });

  it("leaves drags to the page scroller while the page still fits", () => {
    controls.state.scale = FIT_SCALE;

    const host = renderPan(true, false);

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));

    const allowed = fireEvent(
      host,
      touchEvent("touchmove", [{ clientX: 100, clientY: 160 }]),
    );

    expect(allowed).toBe(true);
    expect(controls.panBy).not.toHaveBeenCalled();
  });

  it("attaches no touch interception at the fitted scale", () => {
    controls.state.scale = FIT_SCALE;
    controls.state.positionY = 0;

    const { host, scroller } = renderPanInScroller(false);

    scroller.scrollTop = 300;

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));

    const allowed = fireEvent(
      host,
      touchEvent("touchmove", [{ clientX: 160, clientY: 180 }]),
    );

    // A fitted multi-page preview scrolls natively: the non-passive listener
    // and the pan-bound hand-off must not run at all.
    expect(allowed).toBe(true);
    expect(controls.panBy).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(300);
  });

  it("does nothing on fine pointers", () => {
    const host = renderPan(false);

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 100, clientY: 40 }]));

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
    fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: 140 }]));

    expect(controls.panBy).toHaveBeenCalledWith(-40, -60, 0);
  });

  it("hands the whole leftover to the page on the first at-bound move", () => {
    controls.state.positionY = 0;

    const { host, scroller } = renderPanInScroller();

    scroller.scrollTop = 300;

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));

    const allowed = fireEvent(
      host,
      touchEvent("touchmove", [{ clientX: 160, clientY: 160 }]),
    );

    expect(allowed).toBe(false);
    expect(controls.panBy).not.toHaveBeenCalled();
    // No ramp: the first at-bound move moves the page by its full leftover.
    expect(scroller.scrollTop).toBe(240);
  });

  it("keeps handing every at-bound move to the page scroller", () => {
    controls.state.positionY = 0;

    const { host, scroller } = renderPanInScroller();

    scroller.scrollTop = 300;

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));

    for (const y of [140, 180, 220, 260]) {
      fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: y }]));
    }

    expect(controls.panBy).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(140);
  });

  it("scrolls the paper box across page breaks while zoomed at the bottom bound", () => {
    // The phone shape: [data-canvas-scroll] is a descendant of the touch host,
    // so the ancestor walk cannot find it. A two-page canvas sits at its
    // vertical bottom bound; further upward swipes must move the paper from
    // Page 1 towards Page 2 and Page 3 with no dead zone or vertical lock.
    controls.state.positionY = -400;

    const { host, scroller } = renderPanOnPaperScroller();

    scroller.scrollTop = 120;

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 300 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: 240 }]));

    expect(controls.panBy).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(180);

    fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: 180 }]));

    expect(controls.panBy).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(240);
  });

  it("keeps the hand-off exact when the library position lags a move", () => {
    // `panPositionY` is tracked locally for the gesture, so a stale library
    // `positionY` cannot make the next move pan again instead of scrolling.
    controls.state.positionY = -10;

    const { host, scroller } = renderPanInScroller();

    scroller.scrollTop = 300;

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: 140 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: 180 }]));

    expect(controls.panBy).toHaveBeenCalledTimes(1);
    expect(controls.panBy).toHaveBeenCalledWith(0, 10, 0);
    // 10px was absorbed by the canvas; the remaining 30px + 40px scrolled.
    expect(scroller.scrollTop).toBe(230);
  });

  it("splits the drag when it crosses the canvas edge", () => {
    controls.state.positionY = -10;

    const { host, scroller } = renderPanInScroller();

    scroller.scrollTop = 300;

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 160, clientY: 140 }]));

    expect(controls.panBy).toHaveBeenCalledWith(0, 10, 0);
    expect(scroller.scrollTop).toBe(270);
  });

  it("keeps panning mid-canvas without moving the page", () => {
    const { host, scroller } = renderPanInScroller();

    scroller.scrollTop = 300;

    fireEvent(host, touchEvent("touchstart", [{ clientX: 160, clientY: 100 }]));
    fireEvent(host, touchEvent("touchmove", [{ clientX: 120, clientY: 140 }]));

    expect(controls.panBy).toHaveBeenCalledWith(-40, 40, 0);
    expect(scroller.scrollTop).toBe(300);
  });
});
