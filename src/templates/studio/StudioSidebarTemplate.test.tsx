import { readFileSync } from "node:fs";
import path from "node:path";

import { render, renderHook, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { encodeEntryBlock } from "@/lib/pagination/blockIds";
import { HEADER_BLOCK_ID } from "@/lib/pagination/constants";
import {
  getSectionPlans,
  planBlockKeys,
  planFragmentKeys,
  planMeasureKeys,
} from "@/lib/pagination/sectionPlans";
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

import { fullWidthMeasureId } from "./sidebarSections";
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

  it("keeps only Page 1's assigned sidebar blocks in the aside", () => {
    const doc = buildDoc();
    // Packing caps the Page 1 sidebar, so Certifications did not fit there and
    // now belongs to Page 2's full-width main flow.
    const pages = [
      [
        HEADER_BLOCK_ID,
        encodeEntryBlock("experience", "exp-1", true),
        encodeEntryBlock("skills", "skill-1", true),
      ],
      [
        encodeEntryBlock("experience", "exp-2", false),
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
    expect(
      within(firstSidebar as HTMLElement).getByRole("heading", {
        name: "Skills",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstSidebar as HTMLElement).queryByRole("heading", {
        name: "Certifications",
      }),
    ).toBeNull();
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
    // The sidebar block that did not fit Page 1 now renders full-width here.
    expect(
      within(secondMain as HTMLElement).getByRole("heading", {
        name: "Certifications",
      }),
    ).toBeInTheDocument();
    expect(
      within(secondMain as HTMLElement).getByText("Cloud Architect"),
    ).toBeInTheDocument();
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

  it("labels a fifth certification that spills below Awards on Page 2", () => {
    const doc = createEmptyResume("gengar");
    doc.metadata.page.gapY = 0;
    doc.summary.content = "<p>Impact-driven engineer.</p>";
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
      CertificationItemSchema.parse({
        id: "cert-2",
        name: "Cloud Developer",
        issuer: "Example Institute",
      }),
      CertificationItemSchema.parse({
        id: "cert-3",
        name: "Cloud Security",
        issuer: "Example Institute",
      }),
      CertificationItemSchema.parse({
        id: "cert-4",
        name: "Cloud Network",
        issuer: "Example Institute",
      }),
      CertificationItemSchema.parse({
        id: "cert-5",
        name: "Certification Five",
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

    const order = doc.metadata.layout.pages[0].main;
    const plans = getSectionPlans(doc, order);
    const certPlan = plans.find((plan) => plan.sectionId === "certifications");

    expect(certPlan).toBeDefined();

    const certKeys = planBlockKeys(certPlan!);

    expect(certKeys).toHaveLength(5);

    const heights: Record<string, number> = {};

    heights.summary = 350;
    heights.experience = 400;
    heights.education = 300;
    heights.awards = 200;
    heights.skills = 200;

    for (const key of certKeys) {
      heights[key] = 190;
    }

    const measure: MeasureFn = () => ({
      headerHeightPx: 100,
      heights,
    });
    const { result } = renderHook(() => usePageLayout(doc, { measure }));
    const pages = result.current.pages;

    // Page 1's side column holds four certifications; the fifth spills into
    // the full-width main flow after Awards on Page 2.
    expect(pages).toHaveLength(2);
    for (const key of certKeys.slice(0, 4)) {
      expect(pages[0]).toContain(key);
    }
    expect(pages[0]).not.toContain(certKeys[4]);
    expect(pages[1]).toEqual(["education", "awards", certKeys[4]]);

    const second = render(
      <StudioSidebarTemplate doc={doc} pages={pages} pageIndex={1} />,
    );
    const secondMain =
      second.container.querySelector<HTMLElement>(".studio-main");

    expect(secondMain).not.toBeNull();

    const awardsSection = secondMain?.querySelector<HTMLElement>(
      '[data-section-id="awards"]',
    );
    const certSection = secondMain?.querySelector<HTMLElement>(
      '[data-section-id="certifications"]',
    );

    expect(awardsSection).not.toBeNull();
    expect(certSection).not.toBeNull();
    expect(
      within(awardsSection as HTMLElement).getByRole("heading", {
        name: "Awards",
      }),
    ).toBeInTheDocument();
    expect(
      within(awardsSection as HTMLElement).queryByText("Certification Five"),
    ).toBeNull();
    // The spilled continuation repeats its section heading, so it never reads
    // as another Awards entry.
    expect(
      within(certSection as HTMLElement).getByRole("heading", {
        name: "Certifications (cont.)",
      }),
    ).toBeInTheDocument();
    expect(
      within(certSection as HTMLElement).getByText("Certification Five"),
    ).toBeInTheDocument();
  });

  it("renders a two-item Awards section on Page 2 without dropping a block", () => {
    const doc = createEmptyResume("gengar");
    doc.metadata.page.gapY = 0;
    doc.summary.content = "<p>Impact-driven engineer.</p>";
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
      AwardItemSchema.parse({
        id: "award-2",
        title: "Engineering Excellence",
        awarder: "Analytical Engines",
      }),
    ];

    const order = doc.metadata.layout.pages[0].main;
    const plans = getSectionPlans(doc, order);
    const awardsPlan = plans.find((plan) => plan.sectionId === "awards");

    expect(awardsPlan).toBeDefined();

    const awardsKeys = planBlockKeys(awardsPlan!);
    const heights: Record<string, number> = {};

    for (const key of plans.flatMap(planMeasureKeys)) {
      heights[key] = 120;
    }

    // Summary + Experience fill Page 1's main column; Education then Awards
    // continue on Page 2. Every injected height is positive, so a block that
    // silently measured at 0 would be dropped by buildPackBlocks.
    heights.summary = 300;
    heights.experience = 420;
    heights.education = 320;
    heights.skills = 200;
    heights.certifications = 200;

    for (const key of awardsKeys) {
      heights[key] = 110;
    }

    const measure: MeasureFn = () => ({
      headerHeightPx: 100,
      heights,
    });
    const { result } = renderHook(() => usePageLayout(doc, { measure }));
    const pages = result.current.pages;

    expect(pages).toHaveLength(2);
    expect(pages[0]).not.toContain("awards");

    for (const key of awardsKeys) {
      expect(heights[key]).toBeGreaterThan(0);
      expect(pages[1]).toContain(key);
    }

    expect(pages.flat()).toEqual(expect.arrayContaining(awardsKeys));

    const second = render(
      <StudioSidebarTemplate doc={doc} pages={pages} pageIndex={1} />,
    );
    const secondMain =
      second.container.querySelector<HTMLElement>(".studio-main");

    expect(secondMain).not.toBeNull();
    expect(
      within(secondMain as HTMLElement).getByRole("heading", {
        name: "Awards",
      }),
    ).toBeInTheDocument();
    expect(
      within(secondMain as HTMLElement).getByText("Best Paper"),
    ).toBeInTheDocument();
    expect(
      within(secondMain as HTMLElement).getByText("Engineering Excellence"),
    ).toBeInTheDocument();
  });

  it("fills Page 1's lower-left gap with a tall first entry's first bullets", () => {
    const doc = createEmptyResume("gengar");
    doc.metadata.page.gapY = 0;
    doc.summary.content = "<p>Impact-driven engineer.</p>";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Engineer",
        summary:
          "<ul><li><p>One</p></li><li><p>Two</p></li><li><p>Three</p></li><li><p>Four</p></li></ul>",
      }),
    ];
    doc.sections.skills.items = [
      SkillItemSchema.parse({
        id: "skill-1",
        name: "Languages",
        keywords: ["TypeScript"],
      }),
    ];

    const plans = getSectionPlans(doc, ["summary", "experience", "skills"]);
    const experiencePlan = plans.find((plan) => plan.sectionId === "experience");

    expect(experiencePlan).toBeDefined();

    const fragments = planFragmentKeys(experiencePlan!);
    const measure: MeasureFn = () => ({
      headerHeightPx: 100,
      heights: {
        // A4's default content box is ~1090px tall. Summary leaves ~290px in
        // Page 1's narrow main column: too little for the whole 320px entry,
        // but a quarter of the page is wasted if it moves whole.
        summary: 700,
        experience: 320,
        skills: 200,
        [fragments[0]]: 90,
        [fragments[1]]: 80,
        [fragments[2]]: 80,
        [fragments[3]]: 70,
        [fullWidthMeasureId("experience")]: 200,
        [fullWidthMeasureId(fragments[0])]: 60,
        [fullWidthMeasureId(fragments[1])]: 50,
        [fullWidthMeasureId(fragments[2])]: 50,
        [fullWidthMeasureId(fragments[3])]: 40,
      },
    });
    const { result } = renderHook(() => usePageLayout(doc, { measure }));
    const pages = result.current.pages;

    // Page 1 packs the entry header and the first three bullets in the narrow
    // main column; the last bullet continues on the full-width Page 2.
    expect(pages).toEqual([
      [
        HEADER_BLOCK_ID,
        "summary",
        fragments[0],
        fragments[1],
        fragments[2],
        "skills",
      ],
      [fragments[3]],
    ]);

    const first = render(
      <StudioSidebarTemplate doc={doc} pages={pages} pageIndex={0} />,
    );
    const firstMain = first.container.querySelector<HTMLElement>(".studio-main");
    const firstSidebar =
      first.container.querySelector<HTMLElement>(".studio-sidebar");

    expect(first.container.querySelector(".studio-layout")).not.toHaveClass(
      "studio-layout--full",
    );
    expect(firstSidebar).not.toBeNull();
    expect(
      within(firstSidebar as HTMLElement).getByRole("heading", {
        name: "Skills",
      }),
    ).toBeInTheDocument();
    expect(
      within(firstMain as HTMLElement).getByRole("heading", {
        name: "Experience",
      }),
    ).toBeInTheDocument();
    expect(within(firstMain as HTMLElement).getByText("Acme")).toBeInTheDocument();
    expect(within(firstMain as HTMLElement).getByText("One")).toBeInTheDocument();
    expect(within(firstMain as HTMLElement).getByText("Three")).toBeInTheDocument();
    expect(within(firstMain as HTMLElement).queryByText("Four")).toBeNull();

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
    // Continuation pages repeat neither the section heading nor the entry
    // header; only the remaining bullet renders.
    expect(
      within(secondMain as HTMLElement).queryByRole("heading", {
        name: "Experience",
      }),
    ).toBeNull();
    expect(
      second.container.querySelector(".resume-entry-continuation"),
    ).not.toBeNull();
    expect(within(secondMain as HTMLElement).getByText("Four")).toBeInTheDocument();
    expect(within(secondMain as HTMLElement).queryByText("Acme")).toBeNull();
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

  it("bounds each printed page so a tall Studio grid cannot fragment", () => {
    const css = readFileSync(
      path.resolve(process.cwd(), "src/styles/print.css"),
      "utf8",
    );
    const pageRule = css.match(
      /@media print[\s\S]*?\.resume-page\s*\{([^}]*)\}/,
    );

    expect(pageRule, "the print page rule must exist").not.toBeNull();
    // The page must shrink to its content instead of matching the sheet height,
    // otherwise iOS Safari inserts an alternating blank page.
    expect(pageRule?.[1]).toContain("min-height: 0 !important;");
    expect(pageRule?.[1]).toContain("height: auto !important;");
    expect(pageRule?.[1]).toMatch(
      /max-height:\s*calc\(var\(--page-height[^)]*\)\s*-\s*2mm\)/,
    );
    expect(pageRule?.[1]).toContain("overflow: hidden;");
    expect(pageRule?.[1]).toContain("box-sizing: border-box;");
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
