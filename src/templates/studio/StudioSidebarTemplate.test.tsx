import { readFileSync } from "node:fs";
import path from "node:path";

import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  ExperienceItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";

import { StudioSidebarTemplate } from "./StudioSidebarTemplate";

function buildDoc() {
  const doc = createEmptyResume();

  doc.basics.name = "Ada Lovelace";
  doc.sections.experience.items = [
    ExperienceItemSchema.parse({
      id: "exp-1",
      company: "Analytical Engines",
      position: "Engineer",
    }),
  ];
  doc.sections.skills.items = [
    SkillItemSchema.parse({
      id: "skill-1",
      name: "Languages",
      keywords: ["TypeScript"],
    }),
  ];

  return doc;
}

describe("StudioSidebarTemplate", () => {
  it("renders the two-column layout on Page 1", () => {
    const { container } = render(
      <StudioSidebarTemplate
        doc={buildDoc()}
        pages={[[HEADER_BLOCK_ID, "experience", "skills"]]}
        pageIndex={0}
      />,
    );

    const layout = container.querySelector(".studio-layout");

    expect(layout).not.toBeNull();

    const main = layout?.querySelector(".studio-main");
    const sidebar = layout?.querySelector(".studio-sidebar");

    expect(main).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(sidebar).toHaveAttribute("aria-label", "At a glance");
    expect(
      within(main as HTMLElement).getByRole("heading", { name: "Experience" }),
    ).toBeInTheDocument();
    expect(
      within(sidebar as HTMLElement).getByRole("heading", { name: "Skills" }),
    ).toBeInTheDocument();
  });

  it("defines a two-column grid in the Studio stylesheet", () => {
    const css = readFileSync(
      path.resolve(process.cwd(), "src/templates/studio/studio.css"),
      "utf8",
    );
    const layoutRule = css.match(
      /\.onyx--studio \.studio-layout\s*\{([^}]*)\}/,
    );

    expect(layoutRule, "the studio layout rule must exist").not.toBeNull();
    expect(layoutRule?.[1]).toContain("display: grid;");
    expect(layoutRule?.[1]).toMatch(/grid-template-columns:\s*minmax/);
  });
});
