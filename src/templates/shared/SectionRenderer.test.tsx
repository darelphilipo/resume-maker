import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parsePastedResume } from "@/lib/import/pasteResume";
import {
  encodeEntryBlock,
  encodeEntryFragment,
  encodeEntryGroup,
} from "@/lib/pagination/blockIds";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  CustomSectionSchema,
  ExperienceItemSchema,
  ProfileItemSchema,
  ProjectItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";

import { SectionRenderer } from "./SectionRenderer";

describe("SectionRenderer", () => {
  it("does not render a hidden section at all", () => {
    const doc = createEmptyResume();
    doc.sections.skills.hidden = true;
    doc.sections.skills.items = [
      SkillItemSchema.parse({ id: "s1", name: "TypeScript", level: 4 }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["skills"]} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Skills")).toBeNull();
  });

  it("does not render a section whose entries are all drafts", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "",
        position: "Engineer",
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["experience"]} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Experience")).toBeNull();
  });

  it("omits a Profiles section when every row is promoted into the header", () => {
    const doc = createEmptyResume();
    doc.sections.profiles.items = [
      ProfileItemSchema.parse({
        id: "p1",
        network: "GitHub",
        username: "ada",
        url: "https://github.com/ada",
      }),
      ProfileItemSchema.parse({
        id: "p2",
        network: "LinkedIn",
        username: "ada",
        url: "https://linkedin.com/in/ada",
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["profiles"]} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Profiles")).toBeNull();
  });

  it("keeps a network-only Profiles draft visible in the body", () => {
    const doc = createEmptyResume();
    doc.sections.profiles.items = [
      ProfileItemSchema.parse({
        id: "p1",
        network: "GitHub",
        username: "ada",
        url: "https://github.com/ada",
      }),
      ProfileItemSchema.parse({
        id: "p2",
        network: "Portfolio",
        username: "",
        url: "",
      }),
    ];

    render(<SectionRenderer doc={doc} pageSectionIds={["profiles"]} />);

    expect(screen.getByText("Profiles")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
  });

  it("omits the Profiles section when a Network + Username row is promoted without a URL", () => {
    const doc = createEmptyResume();
    doc.sections.profiles.items = [
      ProfileItemSchema.parse({
        id: "p1",
        network: "GitHub",
        username: "ada",
        url: "",
      }),
      ProfileItemSchema.parse({
        id: "p2",
        network: "Portfolio",
        username: "ada",
        url: "",
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["profiles"]} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Profiles")).toBeNull();
  });

  it("skips hidden individual items", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Visible Co",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Secret Co",
        position: "Manager",
        hidden: true,
      }),
    ];

    render(<SectionRenderer doc={doc} pageSectionIds={["experience"]} />);

    expect(screen.getByText("Visible Co")).toBeInTheDocument();
    expect(screen.queryByText("Secret Co")).toBeNull();
  });

  it("does not render an empty summary", () => {
    const doc = createEmptyResume();
    doc.summary.content = "   ";

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["summary"]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders summary content with a real heading", () => {
    const doc = createEmptyResume();
    doc.summary.content = "<p>Impact-driven engineer.</p>";

    render(<SectionRenderer doc={doc} pageSectionIds={["summary"]} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Summary" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Impact-driven engineer.")).toBeInTheDocument();
  });

  it("ignores unknown section ids without throwing", () => {
    const doc = createEmptyResume();

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["nope", "onyx", ""]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("marks sections that keep together or start a new page", () => {
    const doc = createEmptyResume();
    doc.sections.experience.keepTogether = true;
    doc.sections.experience.startOnNewPage = true;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["experience"]} />,
    );

    const section = container.querySelector(".resume-section");

    expect(section).toHaveAttribute("data-keep-together", "true");
    expect(section).toHaveAttribute("data-start-new-page", "true");
  });

  it("keeps experience and project entries from splitting across pages", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
        summary: "<ul><li>Shipped a thing</li></ul>",
      }),
    ];
    doc.sections.projects.items = [
      ProjectItemSchema.parse({ id: "p1", name: "Ledger API" }),
    ];

    const { container } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={["experience", "projects"]}
      />,
    );

    expect(
      container.querySelectorAll(".resume-entry-keep-together"),
    ).toHaveLength(2);
  });

  it("strips scheme and www from Project and custom URL labels", () => {
    const doc = createEmptyResume();
    doc.sections.projects.items = [
      ProjectItemSchema.parse({
        id: "p1",
        name: "Ledger API",
        url: "https://www.example.com/projects/ledger?ref=home#top",
        keywords: ["TypeScript"],
      }),
    ];
    doc.customSections = [
      CustomSectionSchema.parse({
        id: "custom-links",
        title: "Links",
        items: [
          {
            id: "c1",
            hidden: false,
            name: "Talk",
            description: "",
            date: "",
            location: "Remote",
            url: "https://www.example.com/talks/scaling/",
          },
        ],
      }),
    ];

    const { container } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={["projects", "custom-links"]}
      />,
    );

    const subtitles = Array.from(
      container.querySelectorAll(".resume-entry-subtitle"),
    ).map((node) => node.textContent);

    expect(subtitles).toEqual([
      "example.com/projects/ledger · TypeScript",
      "Remote · example.com/talks/scaling",
    ]);
    expect(screen.queryByText(/https:\/\/|www\./)).not.toBeInTheDocument();
  });

  it("renders a split section's entries as one section with the heading on the first block", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Globex",
        position: "Manager",
      }),
      ExperienceItemSchema.parse({
        id: "e3",
        company: "Initech",
        position: "Director",
      }),
    ];

    const { container, rerender } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={[
          encodeEntryBlock("experience", "e1", true),
          encodeEntryBlock("experience", "e2", false),
        ]}
      />,
    );

    expect(container.querySelectorAll(".resume-section")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 2, name: "Experience" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.queryByText("Initech")).toBeNull();

    rerender(
      <SectionRenderer
        doc={doc}
        pageSectionIds={[encodeEntryBlock("experience", "e3", false)]}
      />,
    );

    expect(container.querySelectorAll(".resume-section")).toHaveLength(1);
    expect(
      screen.queryByRole("heading", { level: 2, name: "Experience" }),
    ).toBeNull();
    expect(screen.getByText("Initech")).toBeInTheDocument();
    expect(screen.queryByText("Acme")).toBeNull();
  });

  it("renders keyword-only skills without a blank category heading", () => {
    const doc = createEmptyResume();
    doc.sections.skills.items = [
      SkillItemSchema.parse({
        id: "s1",
        name: "",
        level: 0,
        keywords: ["SQL", "Excel"],
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["skills"]} />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Skills" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SQL")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(container.querySelector(".resume-entry-title")).toBeNull();
  });

  it("shows an unlabeled pasted skills list in the preview", () => {
    const doc = parsePastedResume(`Robin Park
Analyst
robin@example.com

SKILLS
SQL, Excel
Python`);

    expect(doc).not.toBeNull();
    doc!.sections.skills.keywordLayout = "list";

    render(<SectionRenderer doc={doc!} pageSectionIds={["skills"]} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Skills" }),
    ).toBeInTheDocument();
    expect(screen.getByText("SQL, Excel, Python")).toBeInTheDocument();
  });

  it("drops empty trailing bullet items from the preview", () => {
    const doc = createEmptyResume();
    doc.summary.content = "<ul><li>Impact</li><li><p></p></li></ul>";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
        summary: "<ul><li>Shipped</li><li>   </li></ul>",
      }),
    ];

    const { container } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={["summary", "experience"]}
      />,
    );

    const items = Array.from(
      container.querySelectorAll<HTMLLIElement>(".resume-rich-text li"),
    );

    expect(items.map((item) => item.textContent?.trim())).toEqual([
      "Impact",
      "Shipped",
    ]);
  });

  it("renders skill keywords as pills or as an inline comma list", () => {
    const doc = createEmptyResume();
    doc.sections.skills.items = [
      SkillItemSchema.parse({
        id: "s1",
        name: "TypeScript",
        level: 4,
        keywords: ["React", "Node"],
      }),
    ];

    doc.sections.skills.keywordLayout = "inline";
    const inlineRender = render(
      <SectionRenderer doc={doc} pageSectionIds={["skills"]} />,
    );
    expect(inlineRender.container.querySelectorAll(".resume-skill-pill")).toHaveLength(
      2,
    );
    expect(
      screen.queryByRole("img", { name: /Proficiency/ }),
    ).toBeNull();
    inlineRender.unmount();

    doc.sections.skills.keywordLayout = "list";
    const listRender = render(
      <SectionRenderer doc={doc} pageSectionIds={["skills"]} />,
    );
    expect(
      listRender.container.querySelectorAll(".resume-skill-pill"),
    ).toHaveLength(0);
    expect(screen.getByText("React, Node")).toBeInTheDocument();
  });

  it("keeps experience entries separate when grouping is off", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Acme",
        position: "Senior Engineer",
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["experience"]} />,
    );

    expect(container.querySelector(".resume-company-group")).toBeNull();
    expect(screen.getAllByText("Acme")).toHaveLength(2);
  });

  it("groups consecutive roles at one company under one header", () => {
    const doc = createEmptyResume();
    doc.sections.experience.groupSameCompany = true;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
        location: "Remote",
        startDate: "2020-01",
        endDate: "2021-12",
        summary: "<ul><li>Shipped the first release</li></ul>",
      }),
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Acme",
        position: "Senior Engineer",
        location: "Remote",
        startDate: "2022-01",
        endDate: "2023-06",
        summary: "<ul><li>Led the platform team</li></ul>",
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["experience"]} />,
    );

    expect(container.querySelectorAll(".resume-company-group")).toHaveLength(1);
    expect(
      container.querySelectorAll(".resume-company-group-header"),
    ).toHaveLength(1);
    // Company and location print once in the shared header.
    expect(screen.getAllByText("Acme")).toHaveLength(1);
    expect(screen.getAllByText("Remote")).toHaveLength(1);
    // The header carries the combined span; each role keeps its own dates.
    expect(screen.getByText("Jan 2020 — Jun 2023")).toBeInTheDocument();
    expect(screen.getByText("Jan 2020 — Dec 2021")).toBeInTheDocument();
    expect(screen.getByText("Jan 2022 — Jun 2023")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Engineer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Senior Engineer" }),
    ).toBeInTheDocument();
    // Each promoted role still avoids splitting across pages.
    expect(
      container.querySelectorAll(
        ".resume-company-roles .resume-entry-keep-together",
      ),
    ).toHaveLength(2);
  });

  it("renders one measured company block from an encoded group id", () => {
    const doc = createEmptyResume();
    doc.sections.experience.groupSameCompany = true;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Acme",
        position: "Senior Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "e3",
        company: "Globex",
        position: "Manager",
      }),
    ];

    const { container } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={[encodeEntryGroup("experience", ["e1", "e2"], true)]}
      />,
    );

    expect(container.querySelectorAll(".resume-company-group")).toHaveLength(1);
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Senior Engineer")).toBeInTheDocument();
    // The next company belongs to a different packing block.
    expect(screen.queryByText("Manager")).toBeNull();
  });

  it("does not group roles at different companies", () => {
    const doc = createEmptyResume();
    doc.sections.experience.groupSameCompany = true;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Globex",
        position: "Manager",
      }),
      ExperienceItemSchema.parse({
        id: "e3",
        company: "Acme",
        position: "Director",
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["experience"]} />,
    );

    expect(container.querySelector(".resume-company-group")).toBeNull();
    expect(screen.getAllByText("Acme")).toHaveLength(2);
  });

  it("does not group a hidden role", () => {
    const doc = createEmptyResume();
    doc.sections.experience.groupSameCompany = true;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "e2",
        company: "Acme",
        position: "Senior Engineer",
        hidden: true,
      }),
    ];

    const { container } = render(
      <SectionRenderer doc={doc} pageSectionIds={["experience"]} />,
    );

    expect(container.querySelector(".resume-company-group")).toBeNull();
    expect(screen.queryByText("Senior Engineer")).toBeNull();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
  });

  it("renders only the bullets a fragment owns and keeps the header on the first", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
        summary:
          "<ul><li><p>First bullet</p></li><li><p>Second bullet</p></li><li><p>Third bullet</p></li></ul>",
      }),
    ];

    const { container, rerender } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={[encodeEntryFragment("experience", "e1", true, 0, 0)]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Experience" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("First bullet")).toBeInTheDocument();
    expect(screen.queryByText("Second bullet")).toBeNull();
    expect(container.querySelector(".resume-entry-continuation")).toBeNull();

    rerender(
      <SectionRenderer
        doc={doc}
        pageSectionIds={[encodeEntryFragment("experience", "e1", false, 1, 2)]}
      />,
    );

    // A continuation page repeats neither the section heading nor the entry
    // header; it only carries the remaining bullets.
    expect(
      screen.queryByRole("heading", { level: 2, name: "Experience" }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { level: 3, name: "Engineer" }),
    ).toBeNull();
    expect(screen.queryByText("First bullet")).toBeNull();
    expect(screen.getByText("Second bullet")).toBeInTheDocument();
    expect(screen.getByText("Third bullet")).toBeInTheDocument();
    expect(container.querySelector(".resume-entry-continuation")).not.toBeNull();
  });

  it("merges consecutive fragments of one entry into one continuous entry", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
        summary:
          "<ul><li><p>First bullet</p></li><li><p>Second bullet</p></li><li><p>Third bullet</p></li></ul>",
      }),
    ];

    const { container } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={[
          encodeEntryFragment("experience", "e1", true, 0, 0),
          encodeEntryFragment("experience", "e1", false, 1, 1),
        ]}
      />,
    );

    expect(container.querySelectorAll(".resume-section")).toHaveLength(1);
    expect(container.querySelectorAll(".resume-entry")).toHaveLength(1);
    expect(
      screen.getAllByRole("heading", { level: 3, name: "Engineer" }),
    ).toHaveLength(1);
    expect(screen.getByText("First bullet")).toBeInTheDocument();
    expect(screen.getByText("Second bullet")).toBeInTheDocument();
    expect(screen.queryByText("Third bullet")).toBeNull();
    expect(container.querySelector(".resume-entry-continuation")).toBeNull();
  });

  it("wraps numeric metrics only when the recruiter scan is active", () => {
    const doc = createEmptyResume();
    doc.summary.content =
      "<p>Cut costs by 40% and shipped <strong>3x</strong> faster.</p>";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
        summary: "<ul><li>Saved $1.2M in 2024</li></ul>",
      }),
    ];

    const { container, rerender } = render(
      <SectionRenderer
        doc={doc}
        pageSectionIds={["summary", "experience"]}
      />,
    );

    expect(container.querySelector(".scan-metric")).toBeNull();
    expect(screen.getByText("Saved $1.2M in 2024")).toBeInTheDocument();

    rerender(
      <SectionRenderer
        doc={doc}
        pageSectionIds={["summary", "experience"]}
        scanHighlight
      />,
    );

    const metrics = Array.from(
      container.querySelectorAll(".scan-metric"),
    ).map((node) => node.textContent);

    expect(metrics).toEqual(["40%", "3x", "$1.2M", "2024"]);
    expect(container.querySelectorAll("strong")).toHaveLength(1);
  });
});
