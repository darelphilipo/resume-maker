import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fitTransform = vi.hoisted(() => ({ useFitTransform: vi.fn() }));

// The fit target is what this file is about, so record the arguments instead
// of letting the real hook call the zoom library's imperative transform.
vi.mock("./useFitTransform", () => ({
  useFitTransform: fitTransform.useFitTransform,
}));

import { centeredCanvasOffsetX } from "@/lib/pagination/canvasFrame";
import { computeWidthFitScale } from "@/lib/pagination/fitScale";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import { createEmptyResume } from "@/lib/schema/defaults";
import { pageGeometry } from "@/lib/units/pageGeometry";

import { LiveCanvasViewport } from "./LiveCanvasViewport";

const WIDE_STAGE = 1023;

function createLayout(): PageLayout {
  return {
    pages: [["section-0"]],
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

/**
 * The viewport's own observer is the one that watches the component root, so
 * tests can drive hidden (`display: none`) and visible measurements by hand.
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

let stageWidth = WIDE_STAGE;

beforeEach(() => {
  stageWidth = WIDE_STAGE;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => stageWidth,
  });
  globalThis.ResizeObserver =
    DrivenResizeObserverStub as unknown as typeof ResizeObserver;
  DrivenResizeObserverStub.instances = [];
  fitTransform.useFitTransform.mockReset();
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

async function renderViewport() {
  const doc = createEmptyResume();
  const view = render(
    <LiveCanvasViewport doc={doc} layout={createLayout()} />,
  );

  await waitFor(() => {
    expect(
      view.container.querySelector(".react-transform-wrapper"),
    ).not.toBeNull();
  });

  const observer = DrivenResizeObserverStub.instances.find(
    (instance) => instance.observed === view.container.firstElementChild,
  );

  expect(observer).toBeDefined();

  const geometry = pageGeometry(
    doc.metadata.page.format,
    doc.metadata.page.marginX,
    doc.metadata.page.marginY,
  );
  const fitScale = computeWidthFitScale({
    containerWidthPx: WIDE_STAGE,
    pageWidthPx: geometry.widthPx,
  });
  // The paper is capped at 100%, so the wide stage leaves a centred X offset.
  const offsetX = centeredCanvasOffsetX(WIDE_STAGE, geometry.widthPx * fitScale);

  expect(fitScale).toBe(1);
  expect(offsetX).toBeGreaterThan(0);

  return { view, observer: observer as DrivenResizeObserverStub, fitScale, offsetX };
}

describe("LiveCanvasViewport fit reset key", () => {
  it("re-applies the centred fit when the template changes", async () => {
    const { view, fitScale, offsetX } = await renderViewport();

    expect(fitTransform.useFitTransform).toHaveBeenLastCalledWith(
      fitScale,
      offsetX,
      "onyx:0",
    );

    fitTransform.useFitTransform.mockClear();

    view.rerender(
      <LiveCanvasViewport
        doc={createEmptyResume("gengar")}
        layout={createLayout()}
      />,
    );

    // Same paper and stage, so only the template half of the reset key can
    // announce that the zoom library's clamped position needs restoring.
    expect(fitTransform.useFitTransform).toHaveBeenLastCalledWith(
      fitScale,
      offsetX,
      "gengar:0",
    );
  });

  it("re-applies the centred fit when the hidden preview reappears", async () => {
    const { observer, fitScale, offsetX } = await renderViewport();

    expect(fitTransform.useFitTransform).toHaveBeenLastCalledWith(
      fitScale,
      offsetX,
      "onyx:0",
    );

    fitTransform.useFitTransform.mockClear();

    // Another mobile tab is active: the panel is `display: none` and measures
    // 0px, which makes the zoom library clamp its stored position to x = 0.
    stageWidth = 0;
    act(() => observer.emit());

    expect(fitTransform.useFitTransform).not.toHaveBeenCalled();

    // Back on the Preview tab the stage is measured again and the fit target
    // is unchanged, so the visibility epoch must trigger the re-apply.
    stageWidth = WIDE_STAGE;
    act(() => observer.emit());

    await waitFor(() => {
      expect(fitTransform.useFitTransform).toHaveBeenLastCalledWith(
        fitScale,
        offsetX,
        "onyx:1",
      );
    });
  });
});
