"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode, RefObject } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformComponent,
} from "react-zoom-pan-pinch";
import type {
  ReactZoomPanPinchContentRef,
  ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import type { BulletLintReport } from "@/lib/lint/bulletMetrics";
import { scanBulletLint } from "@/lib/lint/bulletMetrics";
import type { CanvasFrame } from "@/lib/pagination/canvasFrame";
import {
  centeredCanvasOffsetX,
  computeCanvasFrame,
} from "@/lib/pagination/canvasFrame";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { PT_TO_PX, pageGeometry } from "@/lib/units/pageGeometry";
import {
  canvasGestureConfig,
  canvasTouchAction,
  isPreviewZoomed,
} from "@/lib/zoom/canvasGestures";
import { scrollToResumeTop } from "@/lib/zoom/touchScroll";
import {
  initialStableWidthState,
  stabilizeObservedWidth,
  type StableWidthState,
} from "@/lib/zoom/stableWidth";
import {
  isZoomWheel,
  normalizeWheelDelta,
  wheelZoomTarget,
} from "@/lib/zoom/wheelZoom";

import { AtsTextView } from "./AtsTextView";
import { CanvasResetButton, RESET_ANIMATION_MS } from "./CanvasResetButton";
import { BulletTrimTips, PageOverflowBanner } from "./PageOverflowBanner";
import { PageStack } from "./PageStack";
import { TouchPanCanvas } from "./TouchPanCanvas";
import { useFitTransform } from "./useFitTransform";
import { usePreservedScroll } from "./usePreservedScroll";

export type PreviewMode = "canvas" | "ats";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const FIT_MAX_SCALE = 1;
const VIEWPORT_PADDING_PX = 32;
const SCALE_EPSILON = 0.001;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function FitTransform({
  fitScale,
  offsetX,
}: {
  fitScale: number;
  offsetX: number;
}) {
  useFitTransform(fitScale, offsetX);

  return null;
}

function WheelZoom({
  minScale,
  maxScale,
  children,
}: {
  minScale: number;
  maxScale: number;
  children: ReactNode;
}) {
  const { state, zoomToPoint } = useControls();
  const hostRef = useRef<HTMLDivElement>(null);
  const deltaRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const scaleRef = useRef(state.scale);
  const zoomToPointRef = useRef(zoomToPoint);

  useEffect(() => {
    scaleRef.current = state.scale;
    zoomToPointRef.current = zoomToPoint;
  }, [state.scale, zoomToPoint]);

  useEffect(() => {
    const element = hostRef.current;

    if (!element) {
      return;
    }

    const flush = (clientX: number, clientY: number): void => {
      frameRef.current = null;

      const deltaPx = deltaRef.current;

      deltaRef.current = 0;

      if (deltaPx === 0) {
        return;
      }

      const target = wheelZoomTarget(
        scaleRef.current,
        deltaPx,
        minScale,
        maxScale,
      );

      scaleRef.current = target;
      void zoomToPointRef.current(target, clientX, clientY, 0);
    };

    const handleWheel = (event: WheelEvent): void => {
      // Plain wheel / two-finger scrolling belongs to the page scroller so a
      // multi-page resume scrolls smoothly; only Ctrl/⌘ + wheel (the pinch
      // gesture browsers synthesize on trackpads) zooms the canvas.
      if (!isZoomWheel(event)) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const deltaPx = normalizeWheelDelta(event.deltaY, event.deltaMode);

      if (deltaPx === 0) {
        return;
      }

      deltaRef.current += deltaPx;

      if (frameRef.current === null) {
        const { clientX, clientY } = event;

        frameRef.current = requestAnimationFrame(() => {
          flush(clientX, clientY);
        });
      }
    };

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
      deltaRef.current = 0;

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [minScale, maxScale]);

  return <div ref={hostRef}>{children}</div>;
}

/**
 * Preview chrome: the page overflow banner and the page count / Reset toolbar.
 *
 * On phones this is a `shrink-0` row in the Preview column's flex stack, so it
 * sits *outside* the canvas scroller and pages can never bleed above or behind
 * it. At `lg` the preview panel itself scrolls, so the same block sticks below
 * the `Visual`/`ATS text` row instead (see CONTEXT Decisions #33 and #37).
 */
function PreviewChrome({
  banner,
  sticky = true,
  children,
}: {
  banner: ReactNode;
  /**
   * Sticky only over the canvas. The ATS text view is a separate scroll region
   * with copy controls at the top, so its banner must stay in normal flow or it
   * would cover the "Copy all" button while the panel scrolls.
   */
  sticky?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      data-preview-header=""
      className={`z-10 -mx-4 -mt-4 flex shrink-0 flex-col gap-2 border-b border-line/70 bg-background/95 px-4 pb-2 pt-3 backdrop-blur${
        sticky ? " lg:sticky lg:top-14" : ""
      }`}
    >
      {banner}
      {children}
    </div>
  );
}

/**
 * Page-count pill plus the two fit/zoom resets.
 *
 * This bar is rendered *above* `<TransformWrapper>`, in the sticky preview
 * header, so it can never overlap the candidate's name in the top-left corner
 * of Page 1 at any zoom level or paper size.
 */
function CanvasToolbar({
  pageCount,
  appliedFitScale,
  isZoomed,
  bulletReport,
  onResetZoom,
  onResetFit,
}: {
  pageCount: number;
  appliedFitScale: number;
  isZoomed: boolean;
  bulletReport?: BulletLintReport | null;
  onResetZoom: () => void;
  onResetFit?: () => void;
}) {
  const canResetFit = onResetFit !== undefined && appliedFitScale < 1;

  return (
    <div
      data-canvas-toolbar=""
      className="flex min-h-8 flex-wrap items-center justify-between gap-2"
    >
      <span
        aria-live="polite"
        className="rounded-full border border-line/70 bg-surface px-2 py-0.5 text-[11px] font-medium text-muted shadow-sm"
      >
        {pageCount} {pageCount === 1 ? "page" : "pages"}
      </span>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <BulletTrimTips report={bulletReport} />
        {canResetFit ? (
          <button
            type="button"
            onClick={onResetFit}
            aria-label="Reset fit to 100%"
            className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface/95 px-3 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:h-8 sm:px-2.5"
          >
            Reset fit
          </button>
        ) : null}
        {isZoomed ? <CanvasResetButton onReset={onResetZoom} /> : null}
      </div>
    </div>
  );
}

/**
 * The canvas only (no chrome), rendered inside `TransformWrapper`.
 *
 * The transform component subscribes to the zoom level so the touch action can
 * switch from "scroll the page" at fit to "pan the canvas freely" while zoomed.
 */
function CanvasSurface({
  frame,
  fitScale,
  fitOffsetX,
  isCoarsePointer,
  hostRef,
  children,
}: {
  frame: CanvasFrame;
  fitScale: number;
  fitOffsetX: number;
  isCoarsePointer: boolean;
  hostRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const isZoomed = useTransformComponent(({ state }) =>
    isPreviewZoomed(state.scale, fitScale),
  );

  return (
    <>
      <FitTransform fitScale={fitScale} offsetX={fitOffsetX} />
      <TouchPanCanvas
        hostRef={hostRef}
        fitScale={fitScale}
        isZoomed={isZoomed}
        enabled={isCoarsePointer}
      />
      <WheelZoom minScale={Math.min(MIN_SCALE, fitScale)} maxScale={MAX_SCALE}>
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: `${frame.height}px`,
            // At fit, one finger scrolls the page. While zoomed, the canvas is
            // clipped and both axes must pan, so native scrolling is disabled.
            touchAction: canvasTouchAction(isCoarsePointer, isZoomed),
          }}
          contentStyle={{ width: `${frame.width / frame.scale}px` }}
          wrapperProps={
            {
              "data-canvas-height": String(frame.height),
            } as unknown as HTMLAttributes<HTMLDivElement>
          }
        >
          {children}
        </TransformComponent>
      </WheelZoom>
    </>
  );
}

export function LiveCanvasViewport({
  doc,
  layout,
  onFit,
  mode = "canvas",
}: {
  doc: ResumeDocument;
  layout: PageLayout;
  onFit?: (scale: number) => void;
  mode?: PreviewMode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  /**
   * The observed width is fed through an oscillation guard before it can drive
   * `fitScale` / `fitOffsetX`. A scrollbar appearing shrinks the measured width,
   * which shrinks the canvas and can hide the scrollbar again — without the guard
   * the observer would alternate between the two widths forever (Decision #69).
   */
  const widthStateRef = useRef<StableWidthState>(initialStableWidthState);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  /**
   * A re-measure blanks the paper stack for a frame. On desktop the Preview
   * panel is its own scroller, so without this its `scrollTop` would clamp to 0
   * whenever a section is moved (or any other order change re-paginates).
   */
  usePreservedScroll(containerRef, layout.isMeasuring);
  /**
   * Zoom state is stamped with the fit scale it was observed at, so a resize
   * (which changes the fit target and re-fits the canvas) cannot leave a stale
   * "zoomed" toolbar behind without an extra effect.
   */
  const [zoomState, setZoomState] = useState<{
    fitScale: number;
    zoomed: boolean;
  } | null>(null);
  /**
   * Trim hints are measured from the rendered bullets, never guessed from the
   * document model, so the count matches what the user sees on paper.
   */
  const [bulletReport, setBulletReport] = useState<BulletLintReport | null>(
    null,
  );
  const appliedFitScale = doc.metadata.page.fitScale;

  useIsomorphicLayoutEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const query = window.matchMedia("(pointer: coarse)");

    const update = (): void => {
      setIsCoarsePointer(query.matches);
    };

    update();
    query.addEventListener("change", update);

    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateWidth = (): void => {
      const width = element.clientWidth;

      if (width <= 0) {
        return;
      }

      const result = stabilizeObservedWidth(widthStateRef.current, {
        width,
        time:
          typeof performance !== "undefined" ? performance.now() : Date.now(),
      });

      widthStateRef.current = result.state;
      setContainerWidth(result.width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const geometry = pageGeometry(
    doc.metadata.page.format,
    doc.metadata.page.marginX,
    doc.metadata.page.marginY,
  );

  const fitScale =
    containerWidth === null
      ? null
      : clamp(
          (containerWidth - VIEWPORT_PADDING_PX) / geometry.widthPx,
          MIN_SCALE,
          FIT_MAX_SCALE,
        );

  const frame =
    fitScale === null
      ? null
      : computeCanvasFrame({
          pageCount: layout.pages.length,
          pageWidthPx: geometry.widthPx,
          pageHeightPx: geometry.heightPx,
          fitScale,
        });

  // `fitScale` is capped at 1, so the paper can be narrower than the scroller on
  // a wide tablet or a phone showing the desktop site. Centre the fitted canvas
  // instead of leaving the leftover space as a gray strip on the right.
  const canvasViewportWidth =
    containerWidth === null
      ? null
      : Math.max(0, containerWidth - VIEWPORT_PADDING_PX);
  const fitOffsetX =
    frame === null || canvasViewportWidth === null
      ? 0
      : centeredCanvasOffsetX(canvasViewportWidth, frame.width);

  const lineHeightPx =
    doc.metadata.typography.body.fontSize *
    PT_TO_PX *
    doc.metadata.typography.body.lineHeight;

  /**
   * The toolbar lives outside `<TransformWrapper>`, so it cannot read the zoom
   * level from the library context. `onTransform` mirrors that one bit of state
   * into React, and the wrapper ref performs the reset.
   */
  const handleTransform = useCallback(
    (
      _ref: ReactZoomPanPinchRef,
      state: { scale: number; positionX: number; positionY: number },
    ): void => {
      if (fitScale === null) {
        return;
      }

      const zoomed = Math.abs(state.scale - fitScale) > SCALE_EPSILON;

      setZoomState((previous) =>
        previous?.fitScale === fitScale && previous.zoomed === zoomed
          ? previous
          : { fitScale, zoomed },
      );
    },
    [fitScale],
  );

  const isZoomed =
    zoomState !== null &&
    fitScale !== null &&
    zoomState.fitScale === fitScale &&
    zoomState.zoomed;

  /**
   * A reset returns the paper to Page 1 exactly as on first landing in the
   * Preview tab: the transform is restored separately, and this sends the
   * scroll container holding the pages back to the top (the inner box on
   * phones, the sticky panel at `lg` — see CONTEXT #28/#37).
   */
  const resetScroll = useCallback((): void => {
    scrollToResumeTop(scrollRef.current, containerRef.current);
  }, []);

  const resetZoom = useCallback((): void => {
    if (fitScale === null) {
      return;
    }

    resetScroll();
    void wrapperRef.current?.setTransform(
      fitOffsetX,
      0,
      fitScale,
      RESET_ANIMATION_MS,
    );
  }, [fitOffsetX, fitScale, resetScroll]);

  const resetFit = useCallback((): void => {
    resetScroll();
    onFit?.(1);
  }, [onFit, resetScroll]);

  const gestures = canvasGestureConfig(isCoarsePointer);

  const banner = (
    <PageOverflowBanner
      overflowPx={layout.overflowPx}
      pageCount={layout.pages.length}
      lineHeightPx={lineHeightPx}
      fitScale={layout.fitScale}
      fitBlockedReason={layout.fitBlockedReason ?? null}
      bulletReport={bulletReport}
      onFit={onFit}
    />
  );
  const showOverflowBanner = layout.overflowPx > 0 || layout.pages.length > 1;
  const showCanvas = mode === "canvas" && frame !== null && !layout.isMeasuring;

  useIsomorphicLayoutEffect(() => {
    if (
      mode !== "canvas" ||
      layout.isMeasuring ||
      fitScale === null ||
      doc.metadata.layout.pages.length === 0
    ) {
      setBulletReport(null);
      return;
    }

    const root = scrollRef.current;

    if (!root) {
      setBulletReport(null);
      return;
    }

    let cancelled = false;

    const update = (): void => {
      if (!cancelled) {
        setBulletReport(scanBulletLint(root));
      }
    };

    update();

    // Web fonts can change wrapping after the first layout pass.
    const fonts = document.fonts;

    if (fonts) {
      void fonts.ready.then(update).catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [doc, fitScale, layout.isMeasuring, mode]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 w-full flex-1 flex-col gap-4 overflow-clip rounded-xl p-4 lg:flex-none"
    >
      {layout.measureLayer}
      {(mode === "canvas" || showOverflowBanner) ? (
        <PreviewChrome banner={banner} sticky={mode === "canvas"}>
          {showCanvas ? (
            <CanvasToolbar
              pageCount={layout.pages.length}
              appliedFitScale={appliedFitScale}
              isZoomed={isZoomed}
              bulletReport={bulletReport}
              onResetZoom={resetZoom}
              onResetFit={onFit ? resetFit : undefined}
            />
          ) : null}
        </PreviewChrome>
      ) : null}
      {/*
       * The only mobile scroll container in the preview: the chrome above stays
       * fixed, and pages are clipped at its bottom edge instead of scrolling
       * under it. Desktop keeps the panel as the scroller.
       */}
      <div
        ref={scrollRef}
        data-canvas-scroll=""
        className="relative isolate min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] lg:flex-none lg:overflow-visible"
      >
        {showCanvas ? (
          // The gray desk stops at the bottom of the page stack instead of
          // stretching to the bottom of a tall preview panel, so a one-page
          // resume no longer sits above an oversized empty gray void.
          <div
            aria-hidden
            data-canvas-desk=""
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 bg-black/5"
            style={{ height: `${frame!.height}px` }}
          />
        ) : null}
        {showCanvas ? (
          <TransformWrapper
            ref={wrapperRef}
            onTransform={handleTransform}
            initialScale={fitScale!}
            initialPositionX={fitOffsetX}
            initialPositionY={0}
            minScale={Math.min(MIN_SCALE, fitScale!)}
            maxScale={MAX_SCALE}
            centerOnInit={false}
            limitToBounds
            doubleClick={{ disabled: true }}
            wheel={{ disabled: true }}
            pinch={gestures.pinch}
            panning={gestures.panning}
          >
            <CanvasSurface
              frame={frame!}
              fitScale={fitScale!}
              fitOffsetX={fitOffsetX}
              isCoarsePointer={isCoarsePointer}
              hostRef={containerRef}
            >
              <PageStack doc={doc} pages={layout.pages} />
            </CanvasSurface>
          </TransformWrapper>
        ) : null}
        {mode === "ats" ? (
          <AtsTextView doc={doc} />
        ) : frame === null || layout.isMeasuring ? (
          <div
            aria-busy="true"
            data-canvas-placeholder=""
            className="min-h-[240px] w-full rounded-lg bg-white/40"
          />
        ) : null}
      </div>
    </div>
  );
}
