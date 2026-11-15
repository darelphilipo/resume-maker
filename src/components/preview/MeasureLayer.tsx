"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";

import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { HeaderSlot } from "@/templates/shared/HeaderSlot";
import { SectionRenderer } from "@/templates/shared/SectionRenderer";
import "@/templates/onyx/onyx.css";

export type MeasureLayerProps = {
  doc: ResumeDocument;
  order: readonly string[];
  contentWidthPx: number;
  onMeasure: (id: string, heightPx: number) => void;
};

const MEASURED_SELECTOR = "[data-measure-id]";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function scaledPt(value: number, fitScale: number): string {
  return `${Number((value * fitScale).toFixed(2))}pt`;
}

export function MeasureLayer({
  doc,
  order,
  contentWidthPx,
  onMeasure,
}: MeasureLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onMeasureRef = useRef(onMeasure);

  useEffect(() => {
    onMeasureRef.current = onMeasure;
  }, [onMeasure]);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    let disposed = false;

    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(MEASURED_SELECTOR),
    );

    const report = (element: HTMLElement): void => {
      const id = element.dataset.measureId;

      if (!id || disposed) {
        return;
      }

      // A hidden tree (for example during print media) reports zero width.
      // Keep the last good measurements instead of overwriting them with zeros.
      if (
        root.clientWidth === 0 ||
        root.getBoundingClientRect().width === 0
      ) {
        return;
      }

      const heightPx = element.getBoundingClientRect().height;

      if (Number.isFinite(heightPx) && heightPx >= 0) {
        onMeasureRef.current(id, heightPx);
      }
    };

    const reportAll = (): void => {
      for (const node of nodes) {
        report(node);
      }
    };

    reportAll();

    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          report(entry.target as HTMLElement);
        }
      });

      for (const node of nodes) {
        observer.observe(node);
      }
    }

    if (typeof document !== "undefined" && document.fonts) {
      void document.fonts.ready.then(() => {
        reportAll();
      });
    }

    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [doc, order, contentWidthPx]);

  const themeStyle = {
    "--resume-font-size": scaledPt(
      doc.metadata.typography.body.fontSize,
      doc.metadata.page.fitScale,
    ),
    "--resume-line-height": String(doc.metadata.typography.body.lineHeight),
    "--resume-heading-size": scaledPt(
      doc.metadata.typography.heading.fontSize,
      doc.metadata.page.fitScale,
    ),
    "--resume-heading-font": doc.metadata.typography.heading.fontFamily,
    "--resume-fit-scale": String(doc.metadata.page.fitScale),
    "--page-gap-y": scaledPt(doc.metadata.page.gapY, doc.metadata.page.fitScale),
    "--page-gap-x": scaledPt(doc.metadata.page.gapX, doc.metadata.page.fitScale),
    "--item-gap": scaledPt(6, doc.metadata.page.fitScale),
    "--brand-primary": doc.metadata.design.colors.primary,
    fontFamily: doc.metadata.typography.body.fontFamily,
    fontSize: scaledPt(
      doc.metadata.typography.body.fontSize,
      doc.metadata.page.fitScale,
    ),
    lineHeight: doc.metadata.typography.body.lineHeight,
    color: doc.metadata.design.colors.text,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-measure-layer=""
      className="onyx"
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: contentWidthPx,
        visibility: "hidden",
        pointerEvents: "none",
        transform: "none",
        ...themeStyle,
      }}
    >
      <div data-measure-id={HEADER_BLOCK_ID}>
        <HeaderSlot doc={doc} />
      </div>
      {order.map((sectionId, index) => (
        <div key={`${sectionId}-${index}`} data-measure-id={sectionId}>
          <SectionRenderer doc={doc} pageSectionIds={[sectionId]} />
        </div>
      ))}
    </div>
  );
}
