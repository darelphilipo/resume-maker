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
import styles from "@/templates/onyx/onyx.module.css";

export type MeasureLayerProps = {
  doc: ResumeDocument;
  order: readonly string[];
  contentWidthPx: number;
  onMeasure: (id: string, heightPx: number) => void;
};

const MEASURED_SELECTOR = "[data-measure-id]";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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
    "--resume-font-size": `${doc.metadata.typography.body.fontSize}pt`,
    "--resume-line-height": String(doc.metadata.typography.body.lineHeight),
    "--resume-heading-size": `${doc.metadata.typography.heading.fontSize}pt`,
    "--resume-heading-font": doc.metadata.typography.heading.fontFamily,
    "--page-gap-y": `${doc.metadata.page.gapY}pt`,
    "--page-gap-x": `${doc.metadata.page.gapX}pt`,
    "--item-gap": "6pt",
    "--brand-primary": doc.metadata.design.colors.primary,
    fontFamily: doc.metadata.typography.body.fontFamily,
    fontSize: `${doc.metadata.typography.body.fontSize}pt`,
    lineHeight: doc.metadata.typography.body.lineHeight,
    color: doc.metadata.design.colors.text,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-measure-layer=""
      className={styles.onyx}
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
