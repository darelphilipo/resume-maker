"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
} from "react-zoom-pan-pinch";

import { usePageLayout } from "@/lib/pagination/usePageLayout";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { PT_TO_PX } from "@/lib/units/pageGeometry";

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
    <div className="editor-chrome absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-white/90 p-1 shadow-sm">
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

export function LiveCanvasViewport({ doc }: { doc: ResumeDocument }) {
  const layout = usePageLayout(doc);
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

  const fitScale =
    containerWidth === null
      ? null
      : clamp(
          (containerWidth - VIEWPORT_PADDING_PX) / layout.contentWidthPx,
          MIN_SCALE,
          FIT_MAX_SCALE,
        );

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
      {fitScale === null || layout.isMeasuring ? (
        <div
          aria-busy="true"
          data-canvas-placeholder=""
          className="min-h-[240px] w-full rounded-lg bg-white/40"
        />
      ) : (
        <TransformWrapper
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          initialScale={fitScale}
          centerOnInit
          doubleClick={{ disabled: true }}
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
        >
          <CanvasControls fitScale={fitScale} />
          <TransformComponent wrapperStyle={{ width: "100%" }}>
            <PageStack doc={doc} pages={layout.pages} />
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  );
}
