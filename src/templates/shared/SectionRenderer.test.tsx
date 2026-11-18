import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { encodeEntryBlock } from "@/lib/pagination/blockIds";
import { createEmptyResume } from "@/lib/schema/defaults";
import {
  ExperienceItemSchema,
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
});
