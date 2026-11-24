import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  ExperienceItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";

import { computePages } from "./computePages";
import {
  getSectionPlans,
  planBlockKeys,
  planFragmentKeys,
} from "./sectionPlans";

/**
 * Studio Sidebar (`gengar`) Page 1 regression: a tall first Experience entry
 * must start in the narrow main column beside the sidebar and continue at a
 * bullet boundary on the full-width Page 2, instead of moving whole and leaving
 * a quarter of Page 1 blank.
 *
 * This file started as the 2026-11-24 exploration harness (`__scratch`). The
 * runner cannot delete files, so the live cases stay here; fold them into
 * `computePages.test.ts` in a run that can remove the file. The equivalent
 * four-bullet cases live in `computePages.test.ts` and
 * `StudioSidebarTemplate.test.tsx`; these use a realistic 8-bullet role so a
 * continuation spans several bullets.
 */

const EIGHT_BULLETS = `<ul>${Array.from(
  { length: 8 },
  (_, index) => `<li><p>Bullet ${index + 1}</p></li>`,
).join("")}</ul>`;

function buildDoc(extraExperience = false) {
  const doc = createEmptyResume("gengar");
  doc.metadata.page.gapY = 0;
  doc.summary.content = "<p>Impact-driven engineer.</p>";
  doc.sections.experience.items = [
    ExperienceItemSchema.parse({
      id: "e1",
      company: "Acme",
      position: "Engineer",
      summary: EIGHT_BULLETS,
    }),
  ];

  if (extraExperience) {
    doc.sections.experience.items.push(
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Globex",
        position: "Maintainer",
      }),
    );
  }

  doc.sections.skills.items = [
    SkillItemSchema.parse({
      id: "skill-1",
      name: "Languages",
      keywords: ["TypeScript"],
    }),
  ];

  return doc;
}

const CONTENT_HEIGHT_PX = 1000;
const HEADER_HEIGHT_PX = 100;

function heightsFor(
  fragments: readonly string[],
  firstFragment: number,
  rest: number,
): Record<string, number> {
  return Object.fromEntries(
    fragments.map((key, index) => [
      key,
      index === 0 ? firstFragment : rest,
    ]),
  );
}

describe("gengar Page 1 with an oversized first Experience entry", () => {
  it("fills the narrow main column with the entry header and first bullets", () => {
    const doc = buildDoc();
    const plans = getSectionPlans(doc, ["summary", "experience", "skills"]);
    const blocks = planBlockKeys(plans[1]);
    const fragments = planFragmentKeys(plans[1]);

    const result = computePages({
      sectionIds: ["summary", "experience", "skills"],
      heights: {
        summary: 150,
        skills: 400,
        ...heightsFor(fragments, 320, 110),
        [blocks[0]]: 900,
      },
      headerHeightPx: HEADER_HEIGHT_PX,
      gapPx: 0,
      contentHeightPx: CONTENT_HEIGHT_PX,
      plans,
      pinnedToFirstPage: new Set(["skills"]),
      fullWidthHeights: {
        ...heightsFor(fragments, 220, 80),
        [blocks[0]]: 700,
      },
    });

    // The whole entry cannot fit beside the 400px sidebar, so it starts on
    // Page 1 at a bullet boundary and continues on the full-width Page 2.
    expect(result.pages).toEqual([
      [
        "__header",
        "summary",
        fragments[0],
        fragments[1],
        fragments[2],
        fragments[3],
        "skills",
      ],
      [fragments[4], fragments[5], fragments[6], fragments[7]],
    ]);
    expect(result.pages[0]).not.toContain(blocks[0]);
    expect(result.pages).toHaveLength(2);
    expect(result.overflowPx).toBe(0);
  });

  it("keeps the following entry on the continuation page instead of Page 3", () => {
    const doc = buildDoc(true);
    const plans = getSectionPlans(doc, ["summary", "experience", "skills"]);
    const blocks = planBlockKeys(plans[1]);
    const fragments = planFragmentKeys(plans[1]);

    const result = computePages({
      sectionIds: ["summary", "experience", "skills"],
      heights: {
        summary: 300,
        skills: 400,
        ...heightsFor(fragments, 320, 110),
        [blocks[0]]: 700,
        [blocks[1]]: 150,
      },
      headerHeightPx: HEADER_HEIGHT_PX,
      gapPx: 0,
      contentHeightPx: CONTENT_HEIGHT_PX,
      plans,
      pinnedToFirstPage: new Set(["skills"]),
      fullWidthHeights: {
        ...heightsFor(fragments, 220, 80),
        [blocks[0]]: 500,
        [blocks[1]]: 130,
      },
    });

    // Page 2 holds the rest of the split entry and the next role, so the two
    // mechanical pages do not cascade into a nearly empty third page.
    expect(result.pages).toEqual([
      [
        "__header",
        "summary",
        fragments[0],
        fragments[1],
        fragments[2],
        "skills",
      ],
      [fragments[3], fragments[4], fragments[5], fragments[6], fragments[7], blocks[1]],
    ]);
    expect(result.pages).toHaveLength(2);
    expect(result.overflowPx).toBe(0);
  });
});
