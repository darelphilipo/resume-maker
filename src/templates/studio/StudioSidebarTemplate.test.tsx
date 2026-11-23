import { readFileSync } from "node:fs";
import path from "node:path";

import { render, renderHook, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { encodeEntryBlock } from "@/lib/pagination/blockIds";
import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  usePageLayout,
  type MeasureFn,
} from "@/lib/pagination/usePageLayout";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  AwardItemSchema,
  CertificationItemSchema,
  EducationItemSchema,
  ExperienceItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";
import { pageGeometry } from "@/lib/units/pageGeometry";

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
    ExperienceItemSchema.parse({
      id: "exp-2",
      company: "Difference Engine Co",
      position: "Senior Engineer",
    }),
  ];
  doc.sections.skills.items = [
    SkillItemSchema.parse({
      id: "skill-1",
      name: "Languages",
      keywords: ["TypeScript"],
    }),
  ];
  doc.sections.certifications.items = [
    CertificationItemSchema.parse({
      id: "cert-1",
      name: "Cloud Architect",
      issuer: "Example Institute",
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

  it("anchors sidebar blocks to Page 1 and renders main-only pages full-width", () => {
    const doc = buildDoc();
    // Simulate packing: the main column overflows, so the short sidebar
    // sections land on Page 2 after the remaining experience entries.
    const pages = [
      [HEADER_BLOCK_ID, encodeEntryBlock("experience", "exp-1", true)],
      [
        encodeEntryBlock("experience", "exp-2", false),
        encodeEntryBlock("skills", "skill-1", true),
        "certifications",
      ],
    ];

    const first = render(
      <StudioSidebarTemplate doc={doc} pages={pages} pageIndex={0} />,
    );
    const firstLayout = first.container.querySelector(".studio-layout");
    const firstMain = first.container.querySelector<HTMLElement>(".studio-main");
    const firstSidebar =
      first.container.querySelector<HTMLElement>(".studio-sidebar");

    expect(firstLayout).not.toHaveClass("studio-layout--full");
    expect(firstMain).not.toBeNull();
    expect(firstSidebar).not.toBeNull();
    // Both sidebar sections are pinned to Page 1 even though packing put them
    // on Page 2, including a split (entry-level) skills block.
    expect(
      within(firstSidebar as HTMLElement).getByRole("heading", {
        name: "Skills",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstSidebar as HTMLElement).getByRole("heading", {
        name: "Certifications",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstMain as HTMLElement).queryByRole("heading", {
        name: "Skills",
      }),
    ).toBeNull();

    first.unmount();

    const second = render(
      <StudioSidebarTemplate doc={doc} pages={pages} pageIndex={1} />,
    );
    const secondLayout = second.container.querySelector(".studio-layout");
    const secondMain =
      second.container.querySelector<HTMLElement>(".studio-main");

    expect(secondLayout).toHaveClass("studio-layout--full");
    expect(second.container.querySelector(".studio-sidebar")).toBeNull();
    expect(secondMain).not.toBeNull();
    // A split entry block carries no heading; the region name and the entry
    // itself prove the main overflow rendered on this page.
    expect(
      within(secondMain as HTMLElement).getByRole("region", {
        name: "Experience",
      }),
    ).toBeInTheDocument();
    expect(
      within(secondMain as HTMLElement).getByText("Senior Engineer"),
    ).toBeInTheDocument();
    expect(
      within(secondMain as HTMLElement).queryByRole("region", {
        name: "Certifications",
      }),
    ).toBeNull();
  });

  it("keeps Awards on Page 2 when Page 1's sidebar holds Skills and Certifications", () => {
    const doc = createEmptyResume("gengar");
    // A single item per section keeps every plan atomic, so the injected
    // heights are the exact packing blocks. The default order interleaves the
    // sidebar sections between Education and Awards.
    doc.metadata.page.gapY = 0;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Analytical Engines",
        position: "Engineer",
      }),
    ];
    doc.sections.education.items = [
      EducationItemSchema.parse({
        id: "edu-1",
        school: "Analytical University",
        degree: "BSc",
      }),
    ];
    doc.sections.skills.items = [
      SkillItemSchema.parse({
        id: "skill-1",
        name: "Languages",
        keywords: ["TypeScript"],
      }),
    ];
    doc.sections.certifications.items = [
      CertificationItemSchema.parse({
        id: "cert-1",
        name: "Cloud Architect",
        issuer: "Example Institute",
      }),
    ];
    doc.sections.awards.items = [
      AwardItemSchema.parse({
        id: "award-1",
        title: "Best Paper",
        awarder: "ACM",
      }),
    ];

    const { contentHeightPx } = pageGeometry(
      doc.metadata.page.format,
      doc.metadata.page.marginX,
      doc.metadata.page.marginY,
    );
    const headerHeightPx = 100;
    const measure: MeasureFn = () => ({
      headerHeightPx,
      heights: {
        experience: contentHeightPx - headerHeightPx - 1,
        education: 500,
        skills: 250,
        certifications: 250,
        awards: 200,
      },
    });
    const { result } = renderHook(() => usePageLayout(doc, { measure }));
    const pages = result.current.pages;

    // There is no Page 3: the sidebar sections belong to Page 1's side column
    // and never consume Page 2's main-column budget.
    expect(pages).toEqual([
      ["__header", "experience", "skills", "certifications"],
      ["education", "awards"],
    ]);

    const first = render(
      <StudioSidebarTemplate doc={doc} pages={pages} pageIndex={0} />,
    );
    const firstMain = first.container.querySelector<HTMLElement>(".studio-main");
    const firstSidebar =
      first.container.querySelector<HTMLElement>(".studio-sidebar");

    expect(firstSidebar).not.toBeNull();
    expect(
      within(firstSidebar as HTMLElement).getByRole("heading", {
        name: "Skills",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstSidebar as HTMLElement).getByRole("heading", {
        name: "Certifications",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstMain as HTMLElement).getByRole("heading", {
        name: "Experience",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstMain as HTMLElement).queryByRole("heading", {
        name: "Awards",
      }),
    ).toBeNull();

    first.unmount();

    const second = render(
      <StudioSidebarTemplate doc={doc} pages={pages} pageIndex={1} />,
    );
    const secondMain =
      second.container.querySelector<HTMLElement>(".studio-main");

    expect(second.container.querySelector(".studio-layout")).toHaveClass(
      "studio-layout--full",
    );
    expect(second.container.querySelector(".studio-sidebar")).toBeNull();
    expect(secondMain).not.toBeNull();
    expect(
      within(secondMain as HTMLElement).getByRole("heading", {
        name: "Education",
      }),
    ).toBeInTheDocument();
    expect(
      within(secondMain as HTMLElement).getByRole("heading", {
        name: "Awards",
      }),
    ).toBeInTheDocument();
    expect(within(secondMain as HTMLElement).getByText("Best Paper")).toBeInTheDocument();
    expect(second.queryByText("Cloud Architect")).toBeNull();
  });

  it("renders a single full-width column when there are no sidebar sections", () => {
    const doc = buildDoc();

    doc.sections.skills.items = [];
    doc.sections.certifications.items = [];

    const { container } = render(
      <StudioSidebarTemplate
        doc={doc}
        pages={[[HEADER_BLOCK_ID, "experience"]]}
        pageIndex={0}
      />,
    );

    expect(container.querySelector(".studio-layout")).toHaveClass(
      "studio-layout--full",
    );
    expect(container.querySelector(".studio-sidebar")).toBeNull();
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

    const fullRule = css.match(
      /\.onyx--studio \.studio-layout--full\s*\{([^}]*)\}/,
    );

    expect(fullRule, "the full-width modifier rule must exist").not.toBeNull();
    expect(fullRule?.[1]).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });
});
