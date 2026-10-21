"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from "react-zoom-pan-pinch";

import { computeCanvasFrame } from "@/lib/pagination/canvasFrame";
import type { PageLayout } from "@/lib/pagination/usePageLayout";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { PT_TO_PX, pageGeometry } from "@/lib/units/pageGeometry";

import { PageOverflowBanner } from "./PageOverflowBanner";
import { PageStack } from "./PageStack";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const FIT_MAX_SCALE = 1;
const VIEWPORT_PADDING_PX = 32;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function CanvasControls({ fitScale }: { fitScale: number }) {
  const { zoomIn, zoomOut, setTransform } = useControls();

  return (
    <div className="hidden items-center gap-1 rounded-lg bg-white/90 p-1 shadow-sm lg:flex">
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => {
          void zoomOut(0.1);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium hover:bg-black/5"
      >
        −
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => {
          void zoomIn(0.1);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium hover:bg-black/5"
      >
        +
      </button>
      <button
        type="button"
        aria-label="Fit"
        onClick={() => {
          void setTransform(0, 0, fitScale);
        }}
        className="h-7 rounded-md px-2 text-xs font-medium hover:bg-black/5"
      >
        Fit
      </button>
    </div>
  );
}

function FitTransform({ fitScale }: { fitScale: number }) {
  const { setTransform } = useControls();

  useEffect(() => {
    void setTransform(0, 0, fitScale, 0);
  }, [fitScale, setTransform]);

  return null;
}

export function LiveCanvasViewport({
  doc,
  layout,
}: {
  doc: ResumeDocument;
  layout: PageLayout;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

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
      />
      {frame === null || layout.isMeasuring ? (
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
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
        >
          <div className="editor-chrome flex items-center justify-between gap-2 px-1">
            <span aria-live="polite" className="text-xs opacity-70">
              {layout.pages.length}{" "}
              {layout.pages.length === 1 ? "page" : "pages"}
            </span>
            <CanvasControls fitScale={fitScale!} />
          </div>
          <FitTransform fitScale={fitScale!} />
          <TransformComponent
            wrapperStyle={{ width: "100%", height: `${frame.height}px` }}
            contentStyle={{ width: `${frame.width / frame.scale}px` }}
            wrapperProps={
              {
                "data-canvas-height": String(frame.height),
              } as unknown as HTMLAttributes<HTMLDivElement>
            }
          >
            <PageStack doc={doc} pages={layout.pages} />
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  );
}
