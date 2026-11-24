import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

import { computePages } from "./computePages";
import {
  getSectionPlans,
  planBlockKeys,
  planFragmentKeys,
} from "./sectionPlans";

const EIGHT_BULLETS = `<ul>${Array.from(
  { length: 8 },
  (_, i) => `<li><p>Bullet ${i + 1}</p></li>`,
).join("")}</ul>`;

function makeDoc(single: boolean) {
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
    ...(single
      ? []
      : [
          ExperienceItemSchema.parse({
            id: "e2",
            company: "Globex",
            position: "Manager",
          }),
        ]),
  ];
  doc.sections.skills.items = [
    {
      id: "s1",
      name: "Languages",
      keywords: ["TypeScript"],
      level: 0,
      hidden: false,
    },
  ] as never;
  return doc;
}

function run(single: boolean) {
  const doc = makeDoc(single);
  const plans = getSectionPlans(doc, ["summary", "experience", "skills"]);
  const fragments = planFragmentKeys(plans[1]);
  const keys = planBlockKeys(plans[1]);

  const heights: Record<string, number> = {
    summary: 150,
    skills: 400,
    experience: 900,
    [keys[0]]: single ? 900 : 500,
    [fragments[0]]: 320,
  };
  fragments.slice(1).forEach((key) => {
    heights[key] = 110;
  });
  if (!single) {
    heights[keys[1]] = 120;
  }

  const fullWidthHeights: Record<string, number> = {
    experience: 700,
    [keys[0]]: single ? 700 : 380,
    [fragments[0]]: 220,
  };
  fragments.slice(1).forEach((key) => {
    fullWidthHeights[key] = 80;
  });
  if (!single) {
    fullWidthHeights[keys[1]] = 100;
  }

  const result = computePages({
    sectionIds: ["summary", "experience", "skills"],
    heights,
    headerHeightPx: 100,
    gapPx: 0,
    contentHeightPx: 1000,
    plans,
    pinnedToFirstPage: new Set(["skills"]),
    fullWidthHeights,
  });

  return { result, fragments, keys };
}

describe("scratch", () => {
  it("single entry", () => {
    const { result, fragments, keys } = run(true);
    expect({ result, fragments, keys }).toEqual({});
  });

  it("two entries", () => {
    const { result, fragments, keys } = run(false);
    expect({ result, fragments, keys }).toEqual({});
  });
});
