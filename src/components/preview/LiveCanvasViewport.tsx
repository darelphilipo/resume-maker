"use client";

import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode, Ref, RefObject } from "react";
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
  canvasDeskHeight,
  centeredCanvasOffsetX,
  computeCanvasFrame,
} from "@/lib/pagination/canvasFrame";
import { computeWidthFitScale } from "@/lib/pagination/fitScale";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { pageGeometry } from "@/lib/units/pageGeometry";
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
import {
  CanvasResetOverlay,
  RESET_ANIMATION_MS,
} from "./CanvasResetButton";
import { PageStack } from "./PageStack";
import { TouchPanCanvas } from "./TouchPanCanvas";
import { useFitTransform } from "./useFitTransform";
import { usePreservedScroll } from "./usePreservedScroll";

export type PreviewMode = "canvas" | "ats";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const FIT_MAX_SCALE = 1;
const SCALE_EPSILON = 0.001;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function FitTransform({
  fitScale,
  offsetX,
  resetKey,
}: {
  fitScale: number;
  offsetX: number;
  resetKey: string;
}) {
  useFitTransform(fitScale, offsetX, resetKey);

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
 * The canvas only (no chrome), rendered inside `TransformWrapper`.
 *
 * The transform component subscribes to the zoom level so the touch action can
 * switch from "scroll the page" at fit to "pan the canvas freely" while zoomed.
 */
function CanvasSurface({
  frame,
  fitScale,
  fitOffsetX,
  fitResetKey,
  isCoarsePointer,
  hostRef,
  scrollRef,
  children,
}: {
  frame: CanvasFrame;
  fitScale: number;
  fitOffsetX: number;
  fitResetKey: string;
  isCoarsePointer: boolean;
  hostRef: RefObject<HTMLDivElement | null>;
  /**
   * The exact `[data-canvas-scroll]` box. It is a *descendant* of the touch
   * host, so it must be handed to `TouchPanCanvas` directly: the ancestor walk
   * would resolve to `<main>`, which does not scroll while the phone preview is
   * a fixed-height column.
   */
  scrollRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const isZoomed = useTransformComponent(({ state }) =>
    isPreviewZoomed(state.scale, fitScale),
  );

  return (
    <>
      <FitTransform
        fitScale={fitScale}
        offsetX={fitOffsetX}
        resetKey={fitResetKey}
      />
      <TouchPanCanvas
        hostRef={hostRef}
        scrollRef={scrollRef}
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

/** Imperative escapes for Review's Reset fit (and the floating zoom Reset). */
export type LiveCanvasViewportHandle = {
  resetZoom: () => void;
  resetFit: () => void;
};

export function LiveCanvasViewport({
  doc,
  layout,
  onFit,
  mode = "canvas",
  scanHighlight = false,
  onBulletReport,
  ref,
}: {
  doc: ResumeDocument;
  layout: PageLayout;
  onFit?: (scale: number) => void;
  mode?: PreviewMode;
  /** Session-only 6-Second Recruiter Scan; never reaches print or export. */
  scanHighlight?: boolean;
  /**
   * The rendered-bullet report is owned by the mode bar now, because Trim tips
   * lives in the Review dialog. Called with `null` whenever the canvas is not
   * mounted (ATS mode or a re-measure).
   */
  onBulletReport?: (report: BulletLintReport | null) => void;
  ref?: Ref<LiveCanvasViewportHandle>;
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
  /**
   * A hidden mobile tab (`display: none`) measures the stage at 0px. The zoom
   * library clamps its stored position to those 0×0 bounds, so the next visible
   * measurement must re-apply the fitted transform even though the scale and
   * offset are unchanged. `fitEpoch` is the resetKey half that does it.
   */
  const wasHiddenRef = useRef(false);
  const [fitEpoch, setFitEpoch] = useState(0);
  const [viewportWidth, setViewportWidth] = useState<{
    /** Root width, including its responsive padding (drives the fit scale). */
    stage: number;
    /** Scroller content width (drives the centring offset). */
    scroller: number;
  } | null>(null);
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
        // Inactive mobile tab: remember it so the next real measurement can
        // restore the centred, fitted transform.
        wasHiddenRef.current = true;
        return;
      }

      const result = stabilizeObservedWidth(widthStateRef.current, {
        width,
        time:
          typeof performance !== "undefined" ? performance.now() : Date.now(),
      });

      widthStateRef.current = result.state;

      // Centring uses the scroller's content box (excluding the root's padding
      // and the desktop-only gutter) for equal left/right margins. Derive it
      // from the *stabilized* stage width so an A/B scrollbar oscillation
      // cannot sneak back in through the offset and make the paper dance.
      const scrollerWidth = scrollRef.current?.clientWidth ?? width;
      const widthDelta = Math.max(0, width - scrollerWidth);

      setViewportWidth({
        stage: result.width,
        scroller: Math.max(0, result.width - widthDelta),
      });

      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        setFitEpoch((epoch) => epoch + 1);
      }
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
    viewportWidth === null
      ? null
      : computeWidthFitScale({
          containerWidthPx: viewportWidth.stage,
          pageWidthPx: geometry.widthPx,
          minScale: MIN_SCALE,
          maxScale: FIT_MAX_SCALE,
        });

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
  // in the scroller's real content box instead of a padded guess, so the left
  // and right margins stay equal (Decision #85).
  const fitOffsetX =
    frame === null || viewportWidth === null
      ? 0
      : centeredCanvasOffsetX(viewportWidth.scroller, frame.width);

  /**
   * Re-applies the fitted transform when the fit values themselves cannot say
   * that the applied transform is stale: a template switch changes the rendered
   * document without necessarily changing the scale/offset, and a preview tab
   * that was hidden had its position clamped to 0 by the zoom library.
   */
  const fitResetKey = `${doc.metadata.template}:${fitEpoch}`;

  /**
   * The floating reset pill lives outside `<TransformWrapper>`, so it cannot
   * read the zoom level from the library context. `onTransform` mirrors that
   * one bit of state into React, and the wrapper ref performs the reset.
   *
   * These helpers are plain closures on purpose. Each one is consumed by an
   * event handler (`onTransform`, the Reset pill) or the imperative handle, so
   * an unstable identity costs nothing, while the manual `useCallback` wrappers
   * made the hooks lint rule bail out of this component
   * (`react-hooks/preserve-manual-memoization`). Reading `fitScale` /
   * `fitOffsetX` from the current render is also what keeps a reset accurate
   * after a resize changes the fit target.
   */
  const handleTransform = (
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
  };

  const isZoomed =
    mode === "canvas" &&
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
  const resetScroll = (): void => {
    scrollToResumeTop(scrollRef.current, containerRef.current);
  };

  const resetZoom = (): void => {
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
  };

  const resetFit = (): void => {
    resetScroll();
    onFit?.(1);
  };

  // Review drives Reset fit through this ref, while the floating zoom pill
  // below calls `resetZoom` directly. The viewport now owns its zoom bit
  // locally instead of reporting it up to the mode bar (Decision #86).
  useImperativeHandle(ref, () => ({ resetZoom, resetFit }));

  const gestures = canvasGestureConfig(isCoarsePointer);

  const showCanvas = mode === "canvas" && frame !== null && !layout.isMeasuring;

  const deskHeight = frame === null ? 0 : canvasDeskHeight(frame.height);

  useIsomorphicLayoutEffect(() => {
    if (
      mode !== "canvas" ||
      layout.isMeasuring ||
      fitScale === null ||
      doc.metadata.layout.pages.length === 0
    ) {
      onBulletReport?.(null);
      return;
    }

    const root = scrollRef.current;

    if (!root) {
      onBulletReport?.(null);
      return;
    }

    let cancelled = false;

    const update = (): void => {
      if (!cancelled) {
        onBulletReport?.(scanBulletLint(root));
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
  }, [doc, fitScale, layout.isMeasuring, mode, onBulletReport]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-clip rounded-xl px-2 py-2 lg:flex-none lg:p-4"
    >
      {layout.measureLayer}
      {/*
       * The only mobile scroll container in the preview. The page count, Fit,
       * Trim tips, and every review lens now live in the Preview mode bar, so
       * the paper owns this row and its scroller has no stacked chrome above it.
       * Desktop keeps the panel as the scroller.
       */}
      <div
        ref={scrollRef}
        data-canvas-scroll=""
        className="relative isolate min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 lg:[scrollbar-gutter:stable] lg:flex-none lg:overflow-visible"
      >
        {showCanvas ? (
          // The gray desk wraps the scaled page stack plus the scroller's own
          // vertical padding, so Page 1's edge sits inside it and the last page
          // can never spill past the gray edge, while a short resume still does
          // not leave a full-panel gray void.
          <div
            aria-hidden
            data-canvas-desk=""
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 bg-black/5"
            style={{ height: `${deskHeight}px` }}
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
              fitResetKey={fitResetKey}
              isCoarsePointer={isCoarsePointer}
              hostRef={containerRef}
              scrollRef={scrollRef}
            >
              <PageStack
                doc={doc}
                pages={layout.pages}
                scanHighlight={scanHighlight}
              />
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
      {/*
       * The zoom Reset floats over the viewport instead of joining the Preview
       * mode row, so the single `Visual | ATS · Review` row cannot overflow or
       * push Review off-screen on a 390px phone. It is a sibling of the scroller
       * so its bottom-right anchor is the viewport root, not the canvas that
       * transforms under it.
       */}
      <CanvasResetOverlay visible={isZoomed} onReset={resetZoom} />
    </div>
  );
}
