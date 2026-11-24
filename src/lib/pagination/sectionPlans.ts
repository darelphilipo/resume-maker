import { groupExperienceItems } from "@/lib/experience/groupExperience";
import { parseEntryBulletSlices } from "@/lib/richtext/bulletSlices";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import {
  itemId,
  resolveSection,
  text,
  type ListKind,
} from "@/templates/shared/sectionData";

import {
  decodeBlock,
  encodeEntryFragment,
  encodeEntryGroup,
} from "./blockIds";
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
  /**
   * Optional packing groups. Each inner list is measured and packed as one
   * block; grouped Experience promotions use this so one company header never
   * separates from its roles.
   */
  blocks?: string[][];
  /**
   * Entries that may be packed at bullet boundaries when the whole entry is
   * taller than the space available (Decision #90). The first fragment of the
   * section's first entry carries the section heading.
   */
  bulletFragments?: BulletFragmentPlan[];
};

export type BulletFragmentPlan = {
  entryId: string;
  withHeading: boolean;
  /** One encoded block id per bullet, in reading order. */
  keys: string[];
};

/** Rich-text field that owns bullets for each section kind. */
const BULLET_FIELD_BY_KIND: Partial<Record<ListKind, string>> = {
  experience: "summary",
  education: "summary",
  projects: "description",
  awards: "summary",
  volunteer: "summary",
  publications: "summary",
  references: "summary",
  custom: "description",
};

function buildBulletFragments(
  doc: ResumeDocument,
  sectionId: string,
  kind: ListKind,
  items: readonly Record<string, unknown>[],
  hasHeading: boolean,
): BulletFragmentPlan[] | undefined {
  const field = BULLET_FIELD_BY_KIND[kind];

  if (!field) {
    return undefined;
  }

  const fragments: BulletFragmentPlan[] = [];

  items.forEach((item, index) => {
    const slices = parseEntryBulletSlices(text(item, field));

    if (!slices) {
      return;
    }

    const entryId = itemId(item, index);
    const withHeading = hasHeading && index === 0;

    fragments.push({
      entryId,
      withHeading,
      keys: slices.bullets.map((_, bulletIndex) =>
        encodeEntryFragment(
          sectionId,
          entryId,
          withHeading && bulletIndex === 0,
          bulletIndex,
          bulletIndex,
        ),
      ),
    });
  });

  return fragments.length > 0 ? fragments : undefined;
}

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
    const groupedExperience =
      splittable &&
      resolved.kind === "experience" &&
      doc.sections.experience.groupSameCompany === true;
    // A single tall entry is the case this fixes: it stays one packing block in
    // normal flow, but its bullets are measured so packing can split it when it
    // cannot fit. Grouped promotions stay atomic because their company header
    // belongs to the whole group.
    const bulletFragments =
      resolved.kind !== "summary" &&
      !config.keepTogether &&
      config.columns === 1 &&
      !groupedExperience
        ? buildBulletFragments(
            doc,
            sectionId,
            resolved.kind,
            resolved.items,
            hasHeading,
          )
        : undefined;

    return {
      sectionId,
      atomic: !splittable,
      hasHeading,
      startOnNewPage,
      entryIds: splittable
        ? resolved.items.map((item, index) => itemId(item, index))
        : [],
      blocks: groupedExperience
        ? groupExperienceItems(resolved.items).map((group) => group.entryIds)
        : undefined,
      bulletFragments,
    };
  });
}

/**
 * Measurement keys for a plan. The first block of a split section also
 * carries the heading, so the heading and its first entry (or first company
 * group) are one indivisible packing unit (keep-with-next) and no separate gap
 * arithmetic is needed.
 */
export function planBlockKeys(plan: SectionPlan): string[] {
  if (plan.atomic || plan.entryIds.length === 0) {
    return [plan.sectionId];
  }

  const blocks =
    plan.blocks && plan.blocks.length > 0
      ? plan.blocks
      : plan.entryIds.map((entryId) => [entryId]);

  return blocks.map((entryIds, index) =>
    encodeEntryGroup(
      plan.sectionId,
      entryIds,
      index === 0 && plan.hasHeading,
    ),
  );
}

/**
 * One measurement id per bullet fragment. The measure layer renders these in
 * addition to the whole-entry blocks, so packing can choose between keeping an
 * entry atomic and splitting it at a page boundary.
 */
export function planFragmentKeys(plan: SectionPlan): string[] {
  return (plan.bulletFragments ?? []).flatMap((fragment) => fragment.keys);
}

/** Every id the measure layer must report for a plan. */
export function planMeasureKeys(plan: SectionPlan): string[] {
  return [...planBlockKeys(plan), ...planFragmentKeys(plan)];
}

function measuredFragments(
  plan: SectionPlan,
  entryIds: readonly string[],
  heights: Readonly<Record<string, number>>,
): PackBlock[] | undefined {
  if (entryIds.length !== 1) {
    return undefined;
  }

  const fragmentPlan = plan.bulletFragments?.find(
    (fragment) => fragment.entryId === entryIds[0],
  );

  if (!fragmentPlan) {
    return undefined;
  }

  const fragments: PackBlock[] = [];

  for (const key of fragmentPlan.keys) {
    const heightPx = heights[key];

    // Without every fragment height, splitting would guess. Keep the entry
    // atomic until the next measurement pass reports them.
    if (typeof heightPx !== "number" || heightPx < 0) {
      return undefined;
    }

    fragments.push({ id: key, heightPx });
  }

  return fragments.length > 0 ? fragments : undefined;
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
        const atomicEntryId =
          plan.atomic && plan.bulletFragments?.length === 1
            ? [plan.bulletFragments[0].entryId]
            : [];

        blocks.push({
          id: plan.sectionId,
          heightPx,
          startOnNewPage: startOnNewPage.has(plan.sectionId),
          fragments: measuredFragments(plan, atomicEntryId, heights),
        });
      }
      continue;
    }

    keys.forEach((key, index) => {
      const heightPx = heights[key];

      if (typeof heightPx !== "number" || heightPx <= 0) {
        return;
      }

      const decoded = decodeBlock(key);
      const blockEntryIds =
        decoded.kind === "section" && decoded.entryIds
          ? decoded.entryIds
          : [];

      blocks.push({
        id: key,
        heightPx,
        startOnNewPage:
          index === 0 && (startOnNewPage.has(plan.sectionId) || plan.startOnNewPage),
        fragments: measuredFragments(plan, blockEntryIds, heights),
      });
    });
  }

  return blocks;
}
