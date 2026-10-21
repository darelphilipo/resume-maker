import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useVisualViewportOffset } from "./useVisualViewportOffset";

type FakeVisualViewport = {
  height: number;
  offsetTop: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

const originalDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "visualViewport",
);

afterEach(() => {
  if (originalDescriptor) {
    Object.defineProperty(window, "visualViewport", originalDescriptor);
  } else {
    Reflect.deleteProperty(window, "visualViewport");
  }
});

function installVisualViewport(
  height: number,
  offsetTop: number,
): FakeVisualViewport {
  const viewport: FakeVisualViewport = {
    height,
    offsetTop,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: viewport,
  });

  return viewport;
}

describe("useVisualViewportOffset", () => {
  it("returns the keyboard overlap and subscribes to viewport events", () => {
    const viewport = installVisualViewport(500, 50);
    const expected = Math.max(
      0,
      window.innerHeight - viewport.height - viewport.offsetTop,
    );

    const { result } = renderHook(() => useVisualViewportOffset());

    expect(result.current).toBe(expected);
    expect(viewport.addEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(viewport.addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });

  it("updates on resize and removes both listeners on unmount", () => {
    const viewport = installVisualViewport(window.innerHeight - 300, 20);
    const { result, unmount } = renderHook(() => useVisualViewportOffset());
    const resizeCall = viewport.addEventListener.mock.calls.find(
      ([eventName]) => eventName === "resize",
    );
    const resizeHandler = resizeCall?.[1] as (() => void) | undefined;

    expect(result.current).toBe(280);
    expect(resizeHandler).toBeDefined();

    viewport.height = window.innerHeight - 120;

    act(() => {
      resizeHandler?.();
    });

    expect(result.current).toBe(100);

    unmount();

    expect(viewport.removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
    expect(viewport.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });

  it("returns zero when visualViewport is unavailable", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useVisualViewportOffset());

    expect(result.current).toBe(0);
  });
});
