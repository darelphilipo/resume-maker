import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_STACK_GAP_PX,
  centeredCanvasOffsetX,
  computeCanvasFrame,
} from "@/lib/pagination/canvasFrame";
import { computeWidthFitScale } from "@/lib/pagination/fitScale";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { pageGeometry } from "@/lib/units/pageGeometry";

import { LiveCanvasViewport } from "./LiveCanvasViewport";
import { usePreservedScroll } from "./usePreservedScroll";

vi.mock("./PageStack", () => ({
  PageStack: ({ scanHighlight }: { scanHighlight?: boolean }) => (
    <div
      data-testid="page-stack"
      data-scan-highlight={scanHighlight ? "true" : "false"}
    >
      <ul>
        <li>{Array.from({ length: 60 }, () => "Built").join(" ")}</li>
      </ul>
    </div>
  ),
}));

vi.mock("./usePreservedScroll", () => ({
  usePreservedScroll: vi.fn(),
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

/**
 * A ResizeObserver whose width source and callback firing are controlled by the
 * test, so it can reproduce the scrollbar <-> fit-scale feedback loop exactly.
 */
class DrivenResizeObserverStub {
  static instances: DrivenResizeObserverStub[] = [];

  private callback: ResizeObserverCallback;
  observed: Element | null = null;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    DrivenResizeObserverStub.instances.push(this);
  }

  observe = (target: Element): void => {
    this.observed = target;
    this.emit();
  };

  unobserve = vi.fn();
  disconnect = vi.fn();

  emit(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
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
    containerWidth?: number;
    scanHighlight?: boolean;
  } = {},
) {
  const doc = options.doc ?? createEmptyResume();
  const containerWidth = options.containerWidth ?? CONTAINER_WIDTH;

  if (options.containerWidth !== undefined) {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => options.containerWidth as number,
    });
  }

  const view = render(
    <LiveCanvasViewport
      doc={doc}
      layout={createLayout(pageCount)}
      onFit={options.onFit}
      scanHighlight={options.scanHighlight}
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
  const fitScale = computeWidthFitScale({
    containerWidthPx: containerWidth,
    pageWidthPx: geometry.widthPx,
  });

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

  it("passes the recruiter-scan switch through to the page stack", async () => {
    const off = await renderCanvas(1);

    expect(off.view.getByTestId("page-stack")).toHaveAttribute(
      "data-scan-highlight",
      "false",
    );
    off.view.unmount();

    const on = await renderCanvas(1, { scanHighlight: true });

    expect(on.view.getByTestId("page-stack")).toHaveAttribute(
      "data-scan-highlight",
      "true",
    );
  });

  it("centres a fitted page that is narrower than the scroll area", async () => {
    const containerWidth = 1023;
    const { geometry, view } = await renderCanvas(1, { containerWidth });
    const content = view.container.querySelector<HTMLElement>(
      ".react-transform-component",
    );
    // The centre is derived from the scroller's real content width (stubbed to
    // the same value here), not a padded guess that leaves uneven margins.
    const expectedOffset = centeredCanvasOffsetX(
      containerWidth,
      geometry.widthPx,
    );

    expect(expectedOffset).toBeGreaterThan(0);
    expect(content).not.toBeNull();
    await waitFor(() => {
      expect(content!.style.transform).toContain(
        `translate(${expectedOffset}px, 0px)`,
      );
    });
  });

  it("sizes the canvas backdrop to the page stack, not the whole panel", async () => {
    const { geometry, fitScale, view } = await renderCanvas();
    const frame = computeCanvasFrame({
      pageCount: 1,
      pageWidthPx: geometry.widthPx,
      pageHeightPx: geometry.heightPx,
      fitScale,
    });
    const desk = view.container.querySelector<HTMLElement>(
      "[data-canvas-desk]",
    );
    const root = view.container.firstElementChild as HTMLElement;

    expect(desk).not.toBeNull();
    expect(Number.parseFloat(desk!.style.height)).toBeCloseTo(frame.height, 1);
    expect(desk).toHaveClass("bg-black/5");
    // The stage itself must stay transparent, or a short resume still shows a
    // full-height gray void below the paper.
    expect(root).not.toHaveClass("bg-black/5");
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

  it("renders no overflow strip for a one-page resume", async () => {
    await renderCanvas(1);

    // The "1 page" count lives in the mode bar on a single page, so the only
    // chrome shown here is a trim/reset strip when those controls are active.
    expect(
      document.querySelector("[data-page-overflow]"),
    ).not.toBeInTheDocument();
  });

  it("scans rendered bullets and surfaces trim tips in the toolbar", async () => {
    await renderCanvas(1);

    const trigger = await screen.findByRole("button", {
      name: "Trim tips (1)",
    });

    expect(trigger).toBeVisible();

    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Trim tips" }),
    ).toHaveTextContent(/long bullet/);
  });

  it("renders the page count in the slim strip above the canvas, never over the page", async () => {
    const { wrapper } = await renderCanvas(2);

    const badge = screen.getByText("2 pages");
    const strip = badge.closest("[data-page-overflow]");
    const header = badge.closest("[data-preview-header]");

    expect(strip).not.toBeNull();
    expect(header).toContainElement(strip as HTMLElement);
    // The strip lives outside the transform wrapper, so no zoom level or paper
    // size can make it cover the resume header.
    expect(wrapper.contains(header)).toBe(false);
    expect(wrapper.contains(badge)).toBe(false);
    expect(
      header!.compareDocumentPosition(wrapper) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the page-count strip outside the transform wrapper", async () => {
    const { wrapper } = await renderCanvas(2);

    const badge = screen.getByText("2 pages");
    const header = badge.closest("[data-preview-header]");

    // The strip sits above `<TransformWrapper>`, so no scale or pan offset can
    // move it over the candidate's name.
    expect(header).not.toBeNull();
    expect(header).not.toContainElement(wrapper);
    expect(
      header!.compareDocumentPosition(wrapper) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it("scrolls the paper back to the top when a reset is clicked", async () => {
    const doc = createEmptyResume();
    doc.metadata.page.fitScale = 0.85;
    const onFit = vi.fn();

    const { view } = await renderCanvas(2, { doc, onFit });

    const scroll = view.container.querySelector<HTMLDivElement>(
      "[data-canvas-scroll]",
    );

    expect(scroll).not.toBeNull();
    scroll!.scrollTop = 240;
    expect(scroll!.scrollTop).toBe(240);

    fireEvent.click(screen.getByRole("button", { name: "Reset fit to 100%" }));

    // Same position as on first landing in the Preview tab, not where the
    // user had scrolled the multi-page stack.
    expect(scroll!.scrollTop).toBe(0);
    expect(onFit).toHaveBeenCalledWith(1);
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

  it("groups the warning and page count in one slim strip above Page 1", async () => {
    const { wrapper } = await renderCanvas(2);

    const badge = screen.getByText("2 pages");
    const header = badge.closest("[data-preview-header]");

    expect(header).not.toBeNull();
    // Fixed chrome on phones; sticky only once the desktop panel scrolls.
    expect(header).toHaveClass("shrink-0", "z-10");
    expect(header).toHaveClass("lg:sticky", "lg:top-14");
    expect(header).not.toHaveClass("sticky");
    // One compact row, bleeding to the trimmed mobile padding and restoring
    // the desktop padding from `lg` — no tall yellow box or stacked toolbar.
    expect(header).toHaveClass("-mx-2", "px-2", "py-1.5", "flex-nowrap");
    expect(header).toHaveClass("lg:-mx-4", "lg:px-4");
    expect(header).not.toHaveClass("flex-col", "gap-2", "bg-amber-50");
    expect(header).toContainElement(badge);
    expect(wrapper.contains(header)).toBe(false);
    expect(
      header!.compareDocumentPosition(wrapper) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("gives the resume the screen on mobile by trimming the canvas padding", async () => {
    const { view } = await renderCanvas(2);
    const root = view.container.firstElementChild as HTMLElement;

    expect(root).toHaveClass("px-2", "py-2", "gap-2");
    expect(root).toHaveClass("lg:p-4", "lg:gap-4");
  });

  it("keeps the count, trim and reset pills in one compact, scrollable row", async () => {
    const doc = createEmptyResume();
    doc.metadata.page.fitScale = 0.85;

    await renderCanvas(2, { doc, onFit: vi.fn() });

    const badge = screen.getByText("2 pages");
    const header = badge.closest("[data-preview-header]")!;
    const row = header.firstElementChild as HTMLElement;
    const toolbar = header.querySelector<HTMLElement>("[data-canvas-toolbar]")!;
    const trim = screen.getByRole("button", { name: "Trim tips (1)" });
    const reset = screen.getByRole("button", { name: "Reset fit to 100%" });

    // One line that scrolls sideways on a very narrow phone rather than
    // wrapping into several tall rows inside the fixed preview chrome.
    expect(row).toHaveClass(
      "flex-nowrap",
      "overflow-x-auto",
      "no-scrollbar",
    );
    expect(toolbar).toHaveClass("flex-nowrap", "gap-1.5");
    expect(trim).toHaveClass("h-8", "text-xs");
    expect(reset).toHaveClass("h-8", "text-xs");
    expect(header.querySelectorAll("[data-page-overflow]")).toHaveLength(1);
  });

  it("keeps the overflow banner in normal flow above the ATS text view", () => {
    const { container } = render(
      <LiveCanvasViewport
        doc={createEmptyResume()}
        layout={createLayout(2)}
        mode="ats"
      />,
    );

    const banner = screen.getByText("2 pages");
    const header = banner.closest("[data-preview-header]");
    const ats = container.querySelector(
      '[aria-label="ATS plain text preview"]',
    );
    const scroll = container.querySelector("[data-canvas-scroll]");
    const copyAll = screen.getByRole("button", {
      name: "Copy all plain text",
    });

    expect(header).not.toBeNull();
    expect(ats).not.toBeNull();
    expect(scroll).not.toBeNull();
    expect(
      container.querySelector("[data-canvas-desk]"),
    ).not.toBeInTheDocument();
    expect(header).toHaveClass("shrink-0", "z-10");
    // Sticky chrome belongs to the canvas only: over the ATS text it would
    // cover the "Copy all" button and helper copy while the panel scrolls.
    expect(header).not.toHaveClass("lg:sticky");
    expect(header).not.toHaveClass("lg:top-14");
    expect(header).not.toContainElement(ats as HTMLElement);
    expect(scroll).not.toContainElement(header as HTMLElement);
    // One scroll region for the whole ATS view: the copy bar and every section
    // move together instead of a nested box scrolling inside the panel.
    expect(scroll).toContainElement(copyAll);
    expect(scroll).toContainElement(ats as HTMLElement);
    expect(ats).not.toHaveClass("overflow-auto");
    expect((ats as HTMLElement).className).not.toContain("max-h");
    expect(
      header!.compareDocumentPosition(ats as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      header!.compareDocumentPosition(scroll as HTMLElement) &
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

  it("holds the preview scroll while a reorder re-measures the pages", () => {
    render(
      <LiveCanvasViewport
        doc={createEmptyResume()}
        layout={{ ...createLayout(1), pages: [[]], isMeasuring: true }}
      />,
    );

    expect(vi.mocked(usePreservedScroll)).toHaveBeenLastCalledWith(
      expect.anything(),
      true,
    );
  });

  it("reserves the gutter only on desktop and pads the mobile scroller", async () => {
    const { view } = await renderCanvas(2);
    const scroll = view.container.querySelector("[data-canvas-scroll]");

    expect(scroll).not.toBeNull();
    // Phones use overlay scrollbars, so a permanently reserved gutter left a
    // phantom gap on the right; only the desktop panel needs a stable gutter.
    expect(scroll).toHaveClass("lg:[scrollbar-gutter:stable]");
    expect(scroll).not.toHaveClass("[scrollbar-gutter:stable]");
    // Top/bottom breathing room keeps Page 1's edge and shadow from clipping.
    expect(scroll).toHaveClass("py-3");
  });

  it("settles the fit transform when the observer alternates by a scrollbar width", async () => {
    const wide = CONTAINER_WIDTH;
    const narrow = wide - 15;
    let width = wide;

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => width,
    });
    globalThis.ResizeObserver =
      DrivenResizeObserverStub as unknown as typeof ResizeObserver;
    DrivenResizeObserverStub.instances = [];

    const doc = createEmptyResume();
    const view = render(
      <LiveCanvasViewport doc={doc} layout={createLayout(1)} />,
    );

    await waitFor(() => {
      expect(
        view.container.querySelector(".react-transform-wrapper"),
      ).not.toBeNull();
    });

    // The library itself also creates a ResizeObserver; ours is the one watching
    // the LiveCanvasViewport root (the component's outermost element).
    const observer = DrivenResizeObserverStub.instances.find(
      (instance) => instance.observed === view.container.firstElementChild,
    );

    expect(observer).toBeDefined();

    const geometry = pageGeometry(
      doc.metadata.page.format,
      doc.metadata.page.marginX,
      doc.metadata.page.marginY,
    );
    const narrowFit = computeWidthFitScale({
      containerWidthPx: narrow,
      pageWidthPx: geometry.widthPx,
    });
    const settledHeight = computeCanvasFrame({
      pageCount: 1,
      pageWidthPx: geometry.widthPx,
      pageHeightPx: geometry.heightPx,
      fitScale: narrowFit,
    }).height;

    const wrapper = (): HTMLElement =>
      view.container.querySelector<HTMLElement>(".react-transform-wrapper")!;
    const transform = (): string =>
      view.container.querySelector<HTMLElement>(".react-transform-component")!
        .style.transform;
    const heights: string[] = [];
    const transforms: string[] = [];

    // Reproduce the feedback loop: a narrow width shrinks the canvas, which
    // hides the scrollbar and widens it again, over and over.
    const alternating = [
      narrow,
      wide,
      narrow,
      wide,
      narrow,
      wide,
      narrow,
      wide,
      narrow,
      wide,
    ];

    for (const next of alternating) {
      width = next;
      act(() => observer!.emit());
      heights.push(wrapper().style.height);
      transforms.push(transform());
    }

    // Once the guard locks to the smaller width, further A/B alternation must
    // not re-fit the canvas: both the frame height and the applied setTransform
    // settle instead of dancing between two values forever.
    expect(new Set(heights.slice(-5)).size).toBe(1);
    expect(new Set(transforms.slice(-5)).size).toBe(1);

    for (const height of heights.slice(-5)) {
      expect(Number.parseFloat(height)).toBeCloseTo(settledHeight, 1);
    }
  });
});
