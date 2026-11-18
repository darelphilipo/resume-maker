import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_STACK_GAP_PX,
  computeCanvasFrame,
} from "@/lib/pagination/canvasFrame";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
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

async function renderCanvas(
  pageCount = 1,
  options: {
    doc?: ResumeDocument;
    onFit?: (scale: number) => void;
  } = {},
) {
  const doc = options.doc ?? createEmptyResume();
  const view = render(
    <LiveCanvasViewport
      doc={doc}
      layout={createLayout(pageCount)}
      onFit={options.onFit}
    />,
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

  it("renders the page count in a toolbar above the canvas, never over the page", async () => {
    const { wrapper } = await renderCanvas(2);

    const badge = screen.getByText("2 pages");
    const toolbar = badge.closest("[data-canvas-toolbar]");

    expect(toolbar).not.toBeNull();
    // The badge and the Reset control live outside the transform wrapper, so
    // no zoom level or paper size can make them cover the resume header.
    expect(wrapper.contains(toolbar)).toBe(false);
    expect(wrapper.contains(badge)).toBe(false);
    expect(
      toolbar!.compareDocumentPosition(wrapper) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the page-count bar outside the transform wrapper", async () => {
    const { wrapper } = await renderCanvas(2);

    const toolbar = screen.getByText("2 pages").closest("[data-canvas-toolbar]");
    const header = toolbar?.closest("[data-preview-header]");

    expect(toolbar).not.toBeNull();
    // The bar sits above `<TransformWrapper>`, so no scale or pan offset can
    // move it over the candidate's name.
    expect(header).not.toBeNull();
    expect(header).not.toContainElement(wrapper);
    expect(toolbar!.compareDocumentPosition(wrapper) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("offers an inline Reset fit pill whenever a reduced fit scale is applied", async () => {
    const doc = createEmptyResume();
    doc.metadata.page.fitScale = 0.85;
    const onFit = vi.fn();

    await renderCanvas(2, { doc, onFit });

    const button = screen.getByRole("button", { name: "Reset fit to 100%" });

    expect(button).toHaveTextContent("Reset fit");
    fireEvent.click(button);
    expect(onFit).toHaveBeenCalledWith(1);
  });

  it("hides the Reset fit pill at full size", async () => {
    await renderCanvas(1, { onFit: vi.fn() });

    expect(
      screen.queryByRole("button", { name: "Reset fit to 100%" }),
    ).not.toBeInTheDocument();
  });

  it("lets plain wheel and two-finger scrolling pass through to the page", async () => {
    const { wrapper } = await renderCanvas(2);

    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    });

    expect(wrapper.dispatchEvent(event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("zooms only for Ctrl/⌘ + wheel (the trackpad pinch gesture)", async () => {
    const { wrapper } = await renderCanvas();

    for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -100,
        ...modifier,
      });

      expect(wrapper.dispatchEvent(event)).toBe(false);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it("groups the banner and page count in a header above Page 1", async () => {
    const { wrapper } = await renderCanvas(2);

    const badge = screen.getByText("2 pages");
    const header = badge.closest("[data-preview-header]");

    expect(header).not.toBeNull();
    // Fixed chrome on phones; sticky only once the desktop panel scrolls.
    expect(header).toHaveClass("shrink-0", "z-10");
    expect(header).toHaveClass("lg:sticky", "lg:top-14");
    expect(header).not.toHaveClass("sticky");
    expect(header).toContainElement(badge);
    expect(wrapper.contains(header)).toBe(false);
    expect(
      header!.compareDocumentPosition(wrapper) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("scrolls the paper in its own region below the preview chrome", async () => {
    const { wrapper } = await renderCanvas(2);

    const scroll = wrapper.closest("[data-canvas-scroll]");
    const header = screen.getByText("2 pages").closest("[data-preview-header]");

    expect(scroll).not.toBeNull();
    expect(header).not.toBeNull();
    // The paper (and only the paper) scrolls, so pages are clipped at the
    // bottom edge of the chrome instead of scrolling behind it.
    expect(scroll).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "overscroll-contain",
    );
    expect(scroll).toContainElement(wrapper);
    expect(scroll!.contains(header)).toBe(false);
    expect(
      header!.compareDocumentPosition(scroll!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
