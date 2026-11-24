"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";

import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  getSectionPlans,
  planMeasureKeys,
  type SectionPlan,
} from "@/lib/pagination/sectionPlans";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import {
  fullWidthMeasureId,
  isStudioSidebarSection,
} from "@/templates/studio/sidebarSections";
import { HeaderSlot } from "@/templates/shared/HeaderSlot";
import { SectionRenderer } from "@/templates/shared/SectionRenderer";
import { resolveSection } from "@/templates/shared/sectionData";
import {
  buildTemplateThemeStyle,
  scaledPt,
} from "@/templates/shared/templateTheme";
import { templateRootClassName } from "@/templates/shared/templateRoot";
import "@/templates/onyx/onyx.css";
import "@/templates/studio/studio.css";
import "@/templates/variants/variants.css";

export type MeasureLayerProps = {
  doc: ResumeDocument;
  order: readonly string[];
  contentWidthPx: number;
  onMeasure: (id: string, heightPx: number) => void;
  /** Precomputed by `usePageLayout`; derived from `doc`/`order` when omitted. */
  plans?: readonly SectionPlan[];
};

const MEASURED_SELECTOR = "[data-measure-id]";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function MeasureLayer({
  doc,
  order,
  contentWidthPx,
  onMeasure,
  plans,
}: MeasureLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onMeasureRef = useRef(onMeasure);
  const resolvedPlans = useMemo(
    () => plans ?? getSectionPlans(doc, order),
    [plans, doc, order],
  );

  useEffect(() => {
    onMeasureRef.current = onMeasure;
  }, [onMeasure]);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;

    if (!root || !content) {
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
      // The outer fixed box is intentionally 0×0; the inner column carries the
      // real content width, so check that element instead.
      if (
        content.clientWidth === 0 ||
        content.getBoundingClientRect().width === 0
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
  }, [doc, order, contentWidthPx, resolvedPlans]);

  const themeStyle = {
    ...buildTemplateThemeStyle(doc),
    fontSize: scaledPt(
      doc.metadata.typography.body.fontSize,
      doc.metadata.page.fitScale,
    ),
  } as CSSProperties;

  const blocks = resolvedPlans.flatMap((plan) =>
    planMeasureKeys(plan).map((key) => ({
      key,
      sectionId: plan.sectionId,
    })),
  );
  const isStudio = doc.metadata.template === "gengar";
  const mainBlocks = isStudio
    ? blocks.filter((block) => !isStudioSidebarSection(block.sectionId))
    : blocks;
  const sidebarBlocks = isStudio
    ? blocks.filter((block) => isStudioSidebarSection(block.sectionId))
    : [];
  // The real template only shows its sidebar when a sidebar section actually
  // has visible content. Empty sidebar plans still need to report a zero height
  // (or pagination would wait forever), so keep them as blocks but collapse the
  // grid to one full-width column when nothing would render beside the main.
  const hasStudioSidebar =
    isStudio &&
    sidebarBlocks.some(
      (block) => resolveSection(doc, block.sectionId) !== null,
    );

  const renderBlock = (block: { key: string }) => (
    <div key={block.key} data-measure-id={block.key}>
      <SectionRenderer doc={doc} pageSectionIds={[block.key]} />
    </div>
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-measure-layer=""
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        overflow: "hidden",
        visibility: "hidden",
        pointerEvents: "none",
        transform: "none",
      }}
    >
      {/* The 0×0 fixed shell above can never add document height or a scroll
          range on mobile. This inner column keeps the real measuring width, the
          active template's root class, and its theme variables, so variant
          spacing and the Studio Sidebar's narrower main column are measured
          exactly as they render. */}
      <div
        ref={contentRef}
        className={templateRootClassName(doc.metadata.template)}
        style={{ width: contentWidthPx, ...themeStyle }}
      >
        <div data-measure-id={HEADER_BLOCK_ID}>
          <HeaderSlot doc={doc} />
        </div>
        {isStudio ? (
          <div
            className={`studio-layout${
              hasStudioSidebar ? "" : " studio-layout--full"
            }`}
          >
            <main className="page-stack studio-main">
              {(hasStudioSidebar ? mainBlocks : blocks).map(renderBlock)}
            </main>
            {hasStudioSidebar ? (
              <aside className="studio-sidebar" aria-label="At a glance">
                {sidebarBlocks.map(renderBlock)}
              </aside>
            ) : null}
          </div>
        ) : (
          <main className="page-stack">{blocks.map(renderBlock)}</main>
        )}
        {/* Page 1 renders main blocks in the narrow `.studio-main` column and
            sidebar blocks in `.studio-sidebar`. Page 2+ collapses the grid
            (`studio-layout--full`), so every block that lands there occupies the
            full content width. Measure that copy of each block too, otherwise a
            narrow-column height over-reports later pages and can strand a
            trailing section (such as Awards) on an extra page. */}
        {hasStudioSidebar ? (
          <div className="studio-main" data-measure-full-width="">
            {blocks.map((block) => (
              <div
                key={block.key}
                data-measure-id={fullWidthMeasureId(block.key)}
              >
                <SectionRenderer doc={doc} pageSectionIds={[block.key]} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
