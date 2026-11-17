"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from "react-zoom-pan-pinch";

import { computeCanvasFrame } from "@/lib/pagination/canvasFrame";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { PT_TO_PX, pageGeometry } from "@/lib/units/pageGeometry";
import { canvasGestureConfig } from "@/lib/zoom/canvasGestures";
import {
  normalizeWheelDelta,
  wheelZoomTarget,
} from "@/lib/zoom/wheelZoom";

import { AtsTextView } from "./AtsTextView";
import { CanvasResetButton } from "./CanvasResetButton";
import { PageOverflowBanner } from "./PageOverflowBanner";
import { PageStack } from "./PageStack";

export type PreviewMode = "canvas" | "ats";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const FIT_MAX_SCALE = 1;
const VIEWPORT_PADDING_PX = 32;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function FitTransform({ fitScale }: { fitScale: number }) {
  const { setTransform } = useControls();

  useEffect(() => {
    void setTransform(0, 0, fitScale, 0);
  }, [fitScale, setTransform]);

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
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

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

      if (width > 0) {
        setContainerWidth(width);
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

  const lineHeightPx =
    doc.metadata.typography.body.fontSize *
    PT_TO_PX *
    doc.metadata.typography.body.lineHeight;

  const gestures = canvasGestureConfig(isCoarsePointer);

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-col gap-4 overflow-hidden rounded-xl bg-black/5 p-4"
    >
      {layout.measureLayer}
      <PageOverflowBanner
        overflowPx={layout.overflowPx}
        pageCount={layout.pages.length}
        lineHeightPx={lineHeightPx}
        fitScale={layout.fitScale}
        onFit={onFit}
      />
      {mode === "ats" ? (
        <AtsTextView doc={doc} />
      ) : frame === null || layout.isMeasuring ? (
        <div
          aria-busy="true"
          data-canvas-placeholder=""
          className="min-h-[240px] w-full rounded-lg bg-white/40"
        />
      ) : (
        <TransformWrapper
          initialScale={fitScale!}
          initialPositionX={0}
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
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-1 top-1 z-10 flex items-start justify-between gap-2">
              <span
                aria-live="polite"
                className="rounded-full border border-line/70 bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-muted shadow-sm backdrop-blur-sm"
              >
                {layout.pages.length}{" "}
                {layout.pages.length === 1 ? "page" : "pages"}
              </span>
              <CanvasResetButton fitScale={fitScale!} />
            </div>
            <FitTransform fitScale={fitScale!} />
            <WheelZoom
              minScale={Math.min(MIN_SCALE, fitScale!)}
              maxScale={MAX_SCALE}
            >
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: `${frame.height}px`,
                  // One finger scrolls the page; two fingers pinch the canvas.
                  touchAction: gestures.touchAction,
                }}
                contentStyle={{ width: `${frame.width / frame.scale}px` }}
                wrapperProps={
                  {
                    "data-canvas-height": String(frame.height),
                  } as unknown as HTMLAttributes<HTMLDivElement>
                }
              >
                <PageStack doc={doc} pages={layout.pages} />
              </TransformComponent>
            </WheelZoom>
          </div>
        </TransformWrapper>
      )}
    </div>
  );
}
