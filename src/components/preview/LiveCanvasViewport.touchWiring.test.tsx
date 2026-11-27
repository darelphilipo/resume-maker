import { render, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Record the props instead of installing the real touch listener: this file
 * only guards the wiring between the viewport's scroller and the pan handler.
 */
const touchPan = vi.hoisted(() => ({
  props: null as null | Record<string, unknown>,
}));

vi.mock("./TouchPanCanvas", () => ({
  TouchPanCanvas: (props: Record<string, unknown>) => {
    touchPan.props = props;

    return null;
  },
}));

import type { PageLayout } from "@/lib/pagination/usePageLayout";
import { createEmptyResume } from "@/lib/schema/defaults";

import { LiveCanvasViewport } from "./LiveCanvasViewport";

function createLayout(): PageLayout {
  return {
    pages: [["section-0"], ["section-1"]],
    overflowPx: 0,
    isMeasuring: false,
    contentWidthPx: 1,
    contentHeightPx: 1,
    gapPx: 16,
    fitScale: null,
    autoResetFit: false,
    measureLayer: null,
  };
}

class ResizeObserverStub {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = (): void => {
    this.callback([], this as unknown as ResizeObserver);
  };

  unobserve = vi.fn();
  disconnect = vi.fn();
}

const clientWidthDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientWidth",
);
const originalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 390,
  });
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
  touchPan.props = null;
});

afterEach(() => {
  if (clientWidthDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientWidth",
      clientWidthDescriptor,
    );
  } else {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  }

  globalThis.ResizeObserver = originalResizeObserver;
});

describe("LiveCanvasViewport touch hand-off wiring", () => {
  it("passes the exact [data-canvas-scroll] box to the touch pan handler", async () => {
    const view = render(
      <LiveCanvasViewport
        doc={createEmptyResume()}
        layout={createLayout()}
      />,
    );

    await waitFor(() => {
      expect(
        view.container.querySelector(".react-transform-wrapper"),
      ).not.toBeNull();
    });

    const scrollBox = view.container.querySelector<HTMLDivElement>(
      "[data-canvas-scroll]",
    );
    const root = view.container.firstElementChild as HTMLElement;

    expect(scrollBox).not.toBeNull();
    expect(touchPan.props).not.toBeNull();

    const hostRef = touchPan.props!.hostRef as RefObject<HTMLDivElement | null>;
    const scrollRef = touchPan.props!
      .scrollRef as RefObject<HTMLDivElement | null>;

    // Walking ancestors from the root cannot reach the paper scroller on
    // phones, so the descendant must be threaded through explicitly.
    expect(hostRef.current).toBe(root);
    expect(scrollRef.current).toBe(scrollBox);
    expect(scrollRef.current).not.toBe(root);
  });
});
