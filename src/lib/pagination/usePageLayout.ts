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
import {
  buildPackBlocks,
  getSectionPlans,
  planBlockKeys,
  type SectionPlan,
} from "./sectionPlans";

export type MeasureResult = {
  headerHeightPx: number;
  heights: Record<string, number>;
};

export type MeasureFn = (order: readonly string[]) => MeasureResult | null;

/**
 * Why "Fit to 1 Page" cannot offer a target:
 * - `page-break`: a section is forced to start on a new page.
 * - `too-tall`: reaching one page would shrink below the readable floor.
 */
export type FitBlockedReason = "page-break" | "too-tall";

export type PageLayout = {
  pages: string[][];
  overflowPx: number;
  isMeasuring: boolean;
  contentWidthPx: number;
  contentHeightPx: number;
  gapPx: number;
  fitScale: number | null;
  fitBlockedReason?: FitBlockedReason | null;
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
  /** Defaults to `order`; split sections report one height per entry block. */
  expectedKeys: readonly string[] = order,
): boolean {
  if (!headerMeasured) {
    return false;
  }

  return expectedKeys.every((id) => hasMeasuredHeight(heights, id));
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

  const plans = useMemo<SectionPlan[]>(
    () => getSectionPlans(doc, order),
    [doc, order],
  );
  const expectedKeys = useMemo(
    () => plans.flatMap(planBlockKeys),
    [plans],
  );

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
        expectedKeys,
      );

  const measureLayer = measure
    ? null
    : createElement(MeasureLayer, {
        doc,
        order,
        contentWidthPx,
        onMeasure: handleMeasurement,
        plans,
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
      fitBlockedReason: null,
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
    plans,
  });

  const blockHeights = buildPackBlocks(
    plans,
    measurements.heights,
    startOnNewPage,
  ).map((block) => block.heightPx);
  const totalHeightPx =
    measurements.headerHeightPx +
    blockHeights.reduce((sum, heightPx) => sum + heightPx, 0) +
    gapPx * blockHeights.length;
  const fitScale =
    startOnNewPage.size > 0
      ? null
      : computeFitScale({
          totalHeightPx,
          contentHeightPx,
          currentFitScale,
        });

  // Only explain a blocked fit when the resume genuinely needs more than one
  // page; a single-page resume with no target simply hides the fit action.
  const needsExtraPage = packed.pages.length > 1 || packed.overflowPx > 0;
  const fitBlockedReason: FitBlockedReason | null =
    fitScale !== null || !needsExtraPage
      ? null
      : startOnNewPage.size > 0
        ? "page-break"
        : "too-tall";

  return {
    pages: packed.pages,
    overflowPx: packed.overflowPx,
    isMeasuring: false,
    contentWidthPx,
    contentHeightPx,
    gapPx,
    fitScale,
    fitBlockedReason,
    measureLayer,
  };
}
