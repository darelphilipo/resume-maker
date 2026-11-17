import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_STACK_GAP_PX,
  computeCanvasFrame,
} from "@/lib/pagination/canvasFrame";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import { createEmptyResume } from "@/lib/schema/defaults";
import { pageGeometry } from "@/lib/units/pageGeometry";

import { LiveCanvasViewport } from "./LiveCanvasViewport";

vi.mock("./PageStack", () => ({
  PageStack: () => <div data-testid="page-stack" />,
}));

function createLayout(pageCount: number): PageLayout {
  return {
    pages: Array.from({ length: pageCount }, (_, index) => [
      `section-${index}`,
    ]),
    overflowPx: 0,
    isMeasuring: false,
    contentWidthPx: 1,
    contentHeightPx: 1,
    gapPx: 16,
    fitScale: null,
    measureLayer: null,
  };
}

const CONTAINER_WIDTH = 326;

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
const originalMatchMedia = window.matchMedia;
const COARSE_POINTER_QUERY = "(pointer: coarse)";

function stubPointer(coarse: boolean): void {
  window.matchMedia = ((query: string) =>
    ({
      matches: coarse && query === COARSE_POINTER_QUERY,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => CONTAINER_WIDTH,
  });
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
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
  window.matchMedia = originalMatchMedia;
});

async function renderCanvas(pageCount = 1) {
  const doc = createEmptyResume();
  const view = render(
    <LiveCanvasViewport doc={doc} layout={createLayout(pageCount)} />,
  );

  const wrapper = await waitFor(() => {
    const element = view.container.querySelector<HTMLDivElement>(
      ".react-transform-wrapper",
    );

    expect(element).not.toBeNull();

    return element as HTMLDivElement;
  });

  const geometry = pageGeometry(
    doc.metadata.page.format,
    doc.metadata.page.marginX,
    doc.metadata.page.marginY,
  );
  const fitScale = (CONTAINER_WIDTH - 32) / geometry.widthPx;

  return { geometry, fitScale, view, wrapper, doc };
}

describe("LiveCanvasViewport", () => {
  it("sizes the transform wrapper to the scaled page stack height", async () => {
    const { geometry, fitScale, wrapper } = await renderCanvas();
    const frame = computeCanvasFrame({
      pageCount: 1,
      pageWidthPx: geometry.widthPx,
      pageHeightPx: geometry.heightPx,
      fitScale,
    });

    expect(wrapper.style.width).toBe("100%");
    expect(Number.parseFloat(wrapper.style.height)).toBeGreaterThan(0);
    expect(Number.parseFloat(wrapper.style.height)).toBeCloseTo(
      frame.height,
      1,
    );
    expect(Number.parseFloat(wrapper.style.height)).toBeLessThan(
      geometry.heightPx,
    );
    expect(wrapper).toHaveAttribute(
      "data-canvas-height",
      String(frame.height),
    );
  });

  it("includes the scaled stack gap when a second page is added", async () => {
    const { geometry, fitScale, wrapper } = await renderCanvas(2);
    const onePage = computeCanvasFrame({
      pageCount: 1,
      pageWidthPx: geometry.widthPx,
      pageHeightPx: geometry.heightPx,
      fitScale,
    });
    const twoPages = computeCanvasFrame({
      pageCount: 2,
      pageWidthPx: geometry.widthPx,
      pageHeightPx: geometry.heightPx,
      fitScale,
    });

    expect(Number.parseFloat(wrapper.style.height)).toBeCloseTo(
      twoPages.height,
      1,
    );
    expect(twoPages.height - onePage.height).toBeCloseTo(
      (geometry.heightPx + PAGE_STACK_GAP_PX) * fitScale,
      6,
    );
  });

  it("gives the content its unscaled paper width", async () => {
    const { geometry, wrapper } = await renderCanvas();
    const content = wrapper.querySelector<HTMLDivElement>(
      ".react-transform-component",
    );

    expect(content).not.toBeNull();
    expect(Number.parseFloat((content as HTMLDivElement).style.width)).toBeCloseTo(
      geometry.widthPx,
      1,
    );
  });

  it("shows a page count without a zoom toolbar over the resume", async () => {
    await renderCanvas(2);

    expect(screen.getByText("2 pages")).toBeVisible();

    for (const name of [
      "Zoom out",
      "Zoom in",
      "Fit preview to width",
      "Move preview left",
      "Move preview up",
      "Move preview down",
      "Move preview right",
    ]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(
      screen.queryByRole("group", { name: "Preview zoom" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();
  });

  it("keeps native page scrolling for coarse pointers", async () => {
    stubPointer(true);

    const { wrapper } = await renderCanvas();

    // Touch drags must reach the page scroller, not the canvas panning.
    expect(wrapper.style.touchAction).toBe("pan-y");
  });

  it("leaves the canvas pannable for fine pointers", async () => {
    stubPointer(false);

    const { wrapper } = await renderCanvas();

    expect(wrapper.style.touchAction).toBe("auto");
  });
});
