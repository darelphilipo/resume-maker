import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { resolveSection } from "@/templates/shared/sectionData";

import { encodeEntryBlock } from "./blockIds";
import type { PackBlock } from "./packPages";

/**
 * How one section will be measured, packed and rendered. A section is split
 * into per-entry blocks only when doing so cannot change its visual layout:
 * summaries, `keepTogether` sections and multi-column sections stay atomic.
 */
export type SectionPlan = {
  sectionId: string;
  atomic: boolean;
  hasHeading: boolean;
  startOnNewPage: boolean;
  entryIds: string[];
};

export function getSectionPlans(
  doc: ResumeDocument,
  order: readonly string[],
): SectionPlan[] {
  return order.map((sectionId) => {
    const resolved = resolveSection(doc, sectionId);

    if (!resolved) {
      return {
        sectionId,
        atomic: true,
        hasHeading: false,
        startOnNewPage: false,
        entryIds: [],
      };
    }

    const { config } = resolved;
    const hasHeading = config.showHeading && config.title.trim() !== "";
    const startOnNewPage = config.startOnNewPage === true;
    const splittable =
      resolved.kind !== "summary" &&
      !config.keepTogether &&
      config.columns === 1 &&
      resolved.items.length > 1;

    return {
      sectionId,
      atomic: !splittable,
      hasHeading,
      startOnNewPage,
      entryIds: splittable
        ? resolved.items.map((item, index) =>
            typeof item.id === "string" ? item.id : `item-${index}`,
          )
        : [],
    };
  });
}

/**
 * Measurement keys for a plan. The first entry block of a split section also
 * carries the heading, so the heading and its first entry are one indivisible
 * packing unit (keep-with-next) and no separate gap arithmetic is needed.
 */
export function planBlockKeys(plan: SectionPlan): string[] {
  if (plan.atomic || plan.entryIds.length === 0) {
    return [plan.sectionId];
  }

  return plan.entryIds.map((entryId, index) =>
    encodeEntryBlock(
      plan.sectionId,
      entryId,
      index === 0 && plan.hasHeading,
    ),
  );
}

export function buildPackBlocks(
  plans: readonly SectionPlan[],
  heights: Readonly<Record<string, number>>,
  startOnNewPage: ReadonlySet<string> = new Set(),
): PackBlock[] {
  const blocks: PackBlock[] = [];

  for (const plan of plans) {
    const keys = planBlockKeys(plan);
    const hasEntryHeights =
      !plan.atomic &&
      plan.entryIds.length > 1 &&
      keys.some((key) => Object.prototype.hasOwnProperty.call(heights, key));

    if (!hasEntryHeights) {
      const heightPx = heights[plan.sectionId];

      if (typeof heightPx === "number" && heightPx > 0) {
        blocks.push({
          id: plan.sectionId,
          heightPx,
          startOnNewPage: startOnNewPage.has(plan.sectionId),
        });
      }
      continue;
    }

    keys.forEach((key, index) => {
      const heightPx = heights[key];

      if (typeof heightPx !== "number" || heightPx <= 0) {
        return;
      }

      blocks.push({
        id: key,
        heightPx,
        startOnNewPage:
          index === 0 && (startOnNewPage.has(plan.sectionId) || plan.startOnNewPage),
      });
    });
  }

  return blocks;
}
