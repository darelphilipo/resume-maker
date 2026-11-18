import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  ExperienceItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";
import { StudioSidebarTemplate } from "@/templates/studio/StudioSidebarTemplate";

import {
  CompactOnePagerTemplate,
  HybridSkillsTemplate,
  IvyExecutiveTemplate,
  ModernAccentTemplate,
} from "./Variants";

const VARIANTS = [
  [IvyExecutiveTemplate, "onyx--ivy"],
  [ModernAccentTemplate, "onyx--accent"],
  [CompactOnePagerTemplate, "onyx--compact"],
  [HybridSkillsTemplate, "onyx--skills-first"],
] as const;

function sampleDoc() {
  const doc = createEmptyResume();
  doc.basics.name = "Ada Lovelace";
  doc.summary.content = "<p>Summary body</p>";
  doc.sections.experience.items = [
    ExperienceItemSchema.parse({
      id: "e1",
      company: "Analytical Engines",
      position: "Engineer",
      startDate: "2020-01",
      current: true,
    }),
  ];
  doc.sections.skills.items = [
    SkillItemSchema.parse({ id: "s1", name: "Algorithms", level: 3 }),
  ];
  return doc;
}

const PAGES = [["__header", "summary", "experience", "skills"]];

describe("single-column template variants", () => {
  it.each(VARIANTS)("applies %s without changing the shared DOM", (Template, variantClass) => {
    const { container } = render(
      <Template doc={sampleDoc()} pages={PAGES} pageIndex={0} />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("onyx", variantClass);
    expect(root.querySelector("header")).not.toBeNull();
    expect(root.querySelector("main.page-stack")).not.toBeNull();

    for (const heading of ["Summary", "Experience", "Skills"]) {
      expect(
        screen.getByRole("heading", { level: 2, name: heading }),
      ).toBeInTheDocument();
    }
  });

  it("tags sections with their id so CSS variants can target them", () => {
    const { container } = render(
      <HybridSkillsTemplate doc={sampleDoc()} pages={PAGES} pageIndex={0} />,
    );

    expect(
      container.querySelector('.resume-section[data-section-id="skills"]'),
    ).not.toBeNull();
  });
});

describe("StudioSidebarTemplate", () => {
  it("splits compact sections into a sidebar and keeps the header full width", () => {
    const doc = sampleDoc();
    doc.sections.languages.items = [
      { id: "l1", hidden: false, name: "English", level: 5, fluency: "Native" },
    ];

    const { container } = render(
      <StudioSidebarTemplate
        doc={doc}
        pages={[["__header", "summary", "experience", "skills", "languages"]]}
        pageIndex={0}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("onyx", "onyx--studio");

    const main = root.querySelector(".studio-main") as HTMLElement;
    const sidebar = root.querySelector(".studio-sidebar") as HTMLElement;
    expect(main).not.toBeNull();
    expect(sidebar).not.toBeNull();

    expect(main.querySelector('[data-section-id="experience"]')).not.toBeNull();
    expect(main.querySelector('[data-section-id="summary"]')).not.toBeNull();
    expect(sidebar.querySelector('[data-section-id="skills"]')).not.toBeNull();
    expect(sidebar.querySelector('[data-section-id="languages"]')).not.toBeNull();
    expect(main.querySelector('[data-section-id="skills"]')).toBeNull();
    expect(root.querySelector("header")).not.toBeNull();
  });

  it("falls back to the canonical section order when the page is missing", () => {
    const { container } = render(
      <StudioSidebarTemplate doc={sampleDoc()} pages={[]} pageIndex={0} />,
    );

    expect(
      container.querySelector('.resume-section[data-section-id="experience"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "Experience" }),
    ).toBeInTheDocument();
  });
});
