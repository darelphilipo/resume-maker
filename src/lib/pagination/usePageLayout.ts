"use client";

import { createElement, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { MeasureLayer } from "@/components/preview/MeasureLayer";
import {
  DEFAULT_SECTION_ORDER,
  SECTION_IDS,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";
import { PT_TO_PX, pageGeometry } from "@/lib/units/pageGeometry";

import { HEADER_BLOCK_ID } from "./constants";
import { computePages } from "./computePages";
import { computeFitScale } from "./fitScale";

export type MeasureResult = {
  headerHeightPx: number;
  heights: Record<string, number>;
};

export type MeasureFn = (order: readonly string[]) => MeasureResult | null;

export type PageLayout = {
  pages: string[][];
  overflowPx: number;
  isMeasuring: boolean;
  contentWidthPx: number;
  contentHeightPx: number;
  gapPx: number;
  fitScale: number | null;
  measureLayer: ReactNode;
};

type CollectedMeasurement = {
  key: string;
  headerMeasured: boolean;
  headerHeightPx: number;
  heights: Record<string, number>;
};

const HEIGHT_TOLERANCE_PX = 0.5;

function hasMeasuredHeight(
  heights: Readonly<Record<string, number>>,
  id: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(heights, id);
}

export function isMeasurementComplete(
  order: readonly string[],
  headerMeasured: boolean,
  heights: Readonly<Record<string, number>>,
): boolean {
  if (!headerMeasured) {
    return false;
  }

  return order.every((id) => hasMeasuredHeight(heights, id));
}

export function usePageLayout(
  doc: ResumeDocument,
  options?: { measure?: MeasureFn },
): PageLayout {
  const measure = options?.measure;
  const layoutPages = doc.metadata.layout.pages;

  const order = useMemo(() => {
    const firstPage = layoutPages[0];

    if (!firstPage) {
      return [...DEFAULT_SECTION_ORDER];
    }

    return [...firstPage.main, ...firstPage.sidebar];
  }, [layoutPages]);

  const orderKey = order.join("|");

  const { contentWidthPx, contentHeightPx } = useMemo(
    () =>
      pageGeometry(
        doc.metadata.page.format,
        doc.metadata.page.marginX,
        doc.metadata.page.marginY,
      ),
    [
      doc.metadata.page.format,
      doc.metadata.page.marginX,
      doc.metadata.page.marginY,
    ],
  );

  const currentFitScale = doc.metadata.page.fitScale;
  const gapPx = doc.metadata.page.gapY * PT_TO_PX * currentFitScale;

  const startOnNewPage = useMemo(() => {
    const forced = new Set<string>();

    if (doc.summary.startOnNewPage) {
      forced.add("summary");
    }

    for (const sectionId of SECTION_IDS) {
      if (doc.sections[sectionId].startOnNewPage) {
        forced.add(sectionId);
      }
    }

    for (const section of doc.customSections) {
      if (section.startOnNewPage) {
        forced.add(section.id);
      }
    }

    return forced;
  }, [doc.customSections, doc.sections, doc.summary]);

  const injected = useMemo(
    () => (measure ? measure(order) : null),
    [measure, order],
  );
  const [collected, setCollected] = useState<CollectedMeasurement | null>(null);

  const handleMeasurement = useCallback((id: string, heightPx: number) => {
    if (!Number.isFinite(heightPx) || heightPx < 0) {
      return;
    }

    setCollected((previous) => {
      const base: CollectedMeasurement =
        previous && previous.key === orderKey
          ? previous
          : {
              key: orderKey,
              headerMeasured: false,
              headerHeightPx: 0,
              heights: {},
            };

      if (id === HEADER_BLOCK_ID) {
        if (
          base.headerMeasured &&
          Math.abs(base.headerHeightPx - heightPx) <= HEIGHT_TOLERANCE_PX
        ) {
          return previous;
        }

        return { ...base, headerMeasured: true, headerHeightPx: heightPx };
      }

      if (
        hasMeasuredHeight(base.heights, id) &&
        Math.abs(base.heights[id] - heightPx) <= HEIGHT_TOLERANCE_PX
      ) {
        return previous;
      }

      return {
        ...base,
        heights: { ...base.heights, [id]: heightPx },
      };
    });
  }, [orderKey]);

  const currentCollected =
    collected && collected.key === orderKey ? collected : null;
  const measurements = measure ? injected : currentCollected;

  const isMeasuring = measure
    ? injected === null
    : currentCollected === null ||
      !isMeasurementComplete(
        order,
        currentCollected.headerMeasured,
        currentCollected.heights,
      );

  const measureLayer = measure
    ? null
    : createElement(MeasureLayer, {
        doc,
        order,
        contentWidthPx,
        onMeasure: handleMeasurement,
      });

  if (isMeasuring || !measurements) {
    return {
      pages: [[]],
      overflowPx: 0,
      isMeasuring: true,
      contentWidthPx,
      contentHeightPx,
      gapPx,
      fitScale: null,
      measureLayer,
    };
  }

  const packed = computePages({
    sectionIds: order,
    heights: measurements.heights,
    headerHeightPx: measurements.headerHeightPx,
    gapPx,
    contentHeightPx,
    startOnNewPage,
  });

  const sectionHeights = order
    .map((id) => measurements.heights[id] ?? 0)
    .filter((heightPx) => heightPx > 0);
  const totalHeightPx =
    measurements.headerHeightPx +
    sectionHeights.reduce((sum, heightPx) => sum + heightPx, 0) +
    gapPx * sectionHeights.length;
  const fitScale =
    startOnNewPage.size > 0
      ? null
      : computeFitScale({
          totalHeightPx,
          contentHeightPx,
          currentFitScale,
        });

  return {
    pages: packed.pages,
    overflowPx: packed.overflowPx,
    isMeasuring: false,
    contentWidthPx,
    contentHeightPx,
    gapPx,
    fitScale,
    measureLayer,
  };
}
