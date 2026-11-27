import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BulletLintReport } from "@/lib/lint/bulletMetrics";
import {
  CANVAS_SCROLL_PADDING_PX,
  PAGE_STACK_GAP_PX,
  canvasDeskHeight,
  centeredCanvasOffsetX,
  computeCanvasFrame,
} from "@/lib/pagination/canvasFrame";
import { computeWidthFitScale } from "@/lib/pagination/fitScale";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { pageGeometry } from "@/lib/units/pageGeometry";

import {
  LiveCanvasViewport,
  type LiveCanvasViewportHandle,
} from "./LiveCanvasViewport";
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
    autoResetFit: false,
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
    onBulletReport?: (report: BulletLintReport | null) => void;
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
      onBulletReport={options.onBulletReport}
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

  it("sizes the canvas backdrop to the page stack plus the scroller padding", async () => {
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
    // The desk is anchored at the scroller's padding-box top, so it must add
    // both the top and bottom `py-3` padding to cover the full paper edge and
    // stop the last page spilling past the gray backdrop.
    expect(Number.parseFloat(desk!.style.height)).toBeCloseTo(
      canvasDeskHeight(frame.height),
      1,
    );
    expect(Number.parseFloat(desk!.style.height)).toBeCloseTo(
      frame.height + CANVAS_SCROLL_PADDING_PX * 2,
      1,
    );
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

  it("renders no preview chrome row above the canvas", async () => {
    await renderCanvas(2);

    // The page count, Fit, Trim tips, and Reset all live in the Preview mode
    // bar now, so the viewport owns no second toolbar row. The desktop zoom
    // pill floats over the canvas instead of becoming a row.
    expect(
      document.querySelector("[data-preview-header]"),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector("[data-canvas-toolbar]"),
    ).not.toBeInTheDocument();
    expect(document.querySelector("[data-page-overflow]")).not.toBeInTheDocument();
    expect(screen.queryByText("2 pages")).not.toBeInTheDocument();

    const zoomControls = document.querySelector<HTMLElement>(
      "[data-canvas-zoom-controls]",
    );

    expect(zoomControls).not.toBeNull();
    expect(zoomControls).toHaveClass("absolute", "bottom-3", "right-3");
    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();
  });

  it("wires the desktop zoom pill to the fitted canvas", async () => {
    await renderCanvas();

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Reset zoom to fit" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset zoom to fit" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Reset zoom to fit" }),
      ).not.toBeInTheDocument();
    });
  });

  it("floats the zoom Reset over the viewport instead of the mode bar", async () => {
    const { view, wrapper } = await renderCanvas();

    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();

    wrapper.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -120,
        ctrlKey: true,
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Reset preview zoom" }),
      ).toBeInTheDocument();
    });

    const overlay = view.container.querySelector<HTMLElement>(
      "[data-canvas-reset]",
    );

    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass(
      "absolute",
      "bottom-3",
      "right-3",
      "z-20",
      "pointer-events-none",
    );
    // It is a child of the viewport root, not a row above the canvas.
    expect(overlay!.parentElement).toBe(view.container.firstElementChild);
  });

  it("hands the rendered bullet scan to its owner", async () => {
    const onBulletReport = vi.fn<(report: BulletLintReport | null) => void>();

    await renderCanvas(1, { onBulletReport });

    await waitFor(() => {
      expect(onBulletReport).toHaveBeenCalled();
    });

    const report = onBulletReport.mock.calls
      .map(([value]) => value)
      .filter((value): value is BulletLintReport => value !== null)
      .at(-1);

    // jsdom has no line layout, so the long mocked bullet is caught by the
    // character budget instead of the orphan rule.
    expect(report).toBeDefined();
    expect(report?.issues).toHaveLength(1);
  });

  it("clears the bullet report outside canvas mode", () => {
    const onBulletReport = vi.fn();

    render(
      <LiveCanvasViewport
        doc={createEmptyResume()}
        layout={createLayout(2)}
        mode="ats"
        onBulletReport={onBulletReport}
      />,
    );

    expect(onBulletReport).toHaveBeenLastCalledWith(null);
  });

  it("keeps the canvas inside the single scroll region", async () => {
    const { wrapper, view } = await renderCanvas(2);

    const scroll = wrapper.closest("[data-canvas-scroll]");
    const root = view.container.firstElementChild as HTMLElement;

    expect(scroll).not.toBeNull();
    // The paper (and only the paper) scrolls. No chrome row sits between the
    // stage root and that scroller, so Page 1 starts at the top of the canvas.
    expect(scroll).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "overscroll-contain",
    );
    expect(scroll).toContainElement(wrapper);
    expect(root.querySelector("[data-preview-header]")).toBeNull();
  });

  it("exposes both reset paths through its ref", async () => {
    const doc = createEmptyResume();
    doc.metadata.page.fitScale = 0.85;
    const onFit = vi.fn();
    const ref = createRef<LiveCanvasViewportHandle>();

    const view = render(
      <LiveCanvasViewport
        ref={ref}
        doc={doc}
        layout={createLayout(2)}
        onFit={onFit}
      />,
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    const scroll = view.container.querySelector<HTMLDivElement>(
      "[data-canvas-scroll]",
    );

    expect(scroll).not.toBeNull();
    scroll!.scrollTop = 240;

    act(() => {
      ref.current!.resetFit();
    });

    // Reset fit returns the paper to Page 1 and asks the owner for 100%.
    expect(scroll!.scrollTop).toBe(0);
    expect(onFit).toHaveBeenCalledWith(1);

    scroll!.scrollTop = 180;
    act(() => {
      ref.current!.resetZoom();
    });
    expect(scroll!.scrollTop).toBe(0);
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

  it("gives the resume the whole stage and keeps the mode-bar chrome out", async () => {
    const { wrapper, view } = await renderCanvas(2);
    const root = view.container.firstElementChild as HTMLElement;

    // No stacked status row and no inter-row gap: the canvas scroller is the
    // only child after the zero-height measure shell.
    expect(root).toHaveClass("px-2", "py-2");
    // Desktop keeps the horizontal padding (the centered-fit math reads it)
    // but trims the vertical padding so Page 1 starts closer to the mode bar.
    expect(root).toHaveClass("lg:px-4", "lg:py-2");
    expect(root).not.toHaveClass("lg:p-4", "gap-2", "lg:gap-4");
    expect(root.querySelector("[data-preview-header]")).toBeNull();
    expect(wrapper.closest("[data-canvas-scroll]")).not.toBeNull();
  });

  it("keeps the ATS text in one scroll region without preview chrome", () => {
    const { container } = render(
      <LiveCanvasViewport
        doc={createEmptyResume()}
        layout={createLayout(2)}
        mode="ats"
      />,
    );

    const ats = container.querySelector(
      '[aria-label="ATS plain text preview"]',
    );
    const scroll = container.querySelector("[data-canvas-scroll]");
    const copyAll = screen.getByRole("button", {
      name: "Copy all plain text",
    });

    expect(ats).not.toBeNull();
    expect(scroll).not.toBeNull();
    expect(container.querySelector("[data-preview-header]")).toBeNull();
    expect(container.querySelector("[data-page-overflow]")).toBeNull();
    expect(
      container.querySelector("[data-canvas-desk]"),
    ).not.toBeInTheDocument();
    // One scroll region for the whole ATS view: the copy bar and every section
    // move together instead of a nested box scrolling inside the panel.
    expect(scroll).toContainElement(copyAll);
    expect(scroll).toContainElement(ats as HTMLElement);
    expect(ats).not.toHaveClass("overflow-auto");
    expect((ats as HTMLElement).className).not.toContain("max-h");
  });

  it("returns the preview to the top when it switches to the ATS view", () => {
    const doc = createEmptyResume();
    const layout = createLayout(2);
    const view = render(<LiveCanvasViewport doc={doc} layout={layout} />);
    const scroll = view.container.querySelector<HTMLDivElement>(
      "[data-canvas-scroll]",
    );

    expect(scroll).not.toBeNull();
    scroll!.scrollTop = 420;

    view.rerender(
      <LiveCanvasViewport doc={doc} layout={layout} mode="ats" />,
    );

    // A scrolled paper must not leave the ATS intro caption clipped at the
    // scroller's top edge on a 390px phone.
    expect(scroll!.scrollTop).toBe(0);
  });

  it("scrolls the paper in its own region with nothing above it", async () => {
    const { wrapper } = await renderCanvas(2);

    const scroll = wrapper.closest("[data-canvas-scroll]");

    expect(scroll).not.toBeNull();
    // The paper (and only the paper) scrolls; there is no chrome row left to
    // clip it against, and Page 1 starts at the top of the stage.
    expect(scroll).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
      "overscroll-contain",
    );
    expect(scroll).toContainElement(wrapper);
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
