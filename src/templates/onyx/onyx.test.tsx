import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  ExperienceItemSchema,
  SkillItemSchema,
} from "@/lib/schema/resume.schema";

import { getTemplate, TEMPLATES } from "../registry";
import { OnyxTemplate } from "./OnyxTemplate";

describe("OnyxTemplate", () => {
  it("renders page sections in order and ignores unknown ids", () => {
    const doc = createEmptyResume();
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "e1",
        company: "Acme",
        position: "Engineer",
        startDate: "2020-01",
        current: true,
      }),
    ];
    doc.sections.skills.items = [
      SkillItemSchema.parse({ id: "s1", name: "TypeScript", level: 3 }),
    ];

    render(
      <OnyxTemplate
        doc={doc}
        pages={[["experience", "nope", "skills"]]}
        pageIndex={0}
      />,
    );

    const experience = screen.getByRole("heading", {
      level: 2,
      name: "Experience",
    });
    const skills = screen.getByRole("heading", { level: 2, name: "Skills" });

    expect(
      experience.compareDocumentPosition(skills) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText("nope")).toBeNull();
  });

  it("renders the header only when the page includes the header block", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";

    const withHeader = render(
      <OnyxTemplate
        doc={doc}
        pages={[["__header", "summary"]]}
        pageIndex={0}
      />,
    );

    expect(withHeader.container.querySelector("header")).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Ada Lovelace" }),
    ).toBeInTheDocument();

    withHeader.unmount();

    const withoutHeader = render(
      <OnyxTemplate doc={doc} pages={[["summary"]]} pageIndex={0} />,
    );

    expect(withoutHeader.container.querySelector("header")).toBeNull();
  });

  it("never renders the header block id as a section heading", () => {
    const doc = createEmptyResume();
    const { container } = render(
      <OnyxTemplate doc={doc} pages={[["__header"]]} pageIndex={0} />,
    );

    expect(container.textContent).not.toContain("__header");
    expect(
      screen.queryByRole("heading", { name: "__header" }),
    ).toBeNull();
  });

  it("falls back to the canonical order when the page is missing", () => {
    const doc = createEmptyResume();
    doc.summary.content = "<p>Summary body</p>";

    render(<OnyxTemplate doc={doc} pages={[]} pageIndex={0} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Summary" }),
    ).toBeInTheDocument();
  });

  it("derives root CSS custom properties from the document", () => {
    const doc = createEmptyResume();
    doc.metadata.typography.body.fontSize = 12;
    doc.metadata.typography.body.lineHeight = 1.5;
    doc.metadata.typography.heading.fontSize = 16;
    doc.metadata.page.gapY = 14;
    doc.metadata.page.gapX = 9;
    doc.metadata.design.colors.primary = "#123456";
    doc.metadata.design.colors.text = "#222222";
    doc.metadata.design.colors.background = "#fafafa";

    const { container } = render(
      <OnyxTemplate doc={doc} pages={[[]]} pageIndex={0} />,
    );
    const root = container.firstElementChild as HTMLElement;

    expect(root.style.getPropertyValue("--resume-font-size")).toBe("12pt");
    expect(root.style.getPropertyValue("--resume-line-height")).toBe("1.5");
    expect(root.style.getPropertyValue("--resume-heading-size")).toBe("16pt");
    expect(root.style.getPropertyValue("--page-gap-y")).toBe("14pt");
    expect(root.style.getPropertyValue("--page-gap-x")).toBe("9pt");
    expect(root.style.getPropertyValue("--item-gap")).toBe("6pt");
    expect(root.style.getPropertyValue("--brand-primary")).toBe("#123456");
    expect(root.style.color).toBe("rgb(34, 34, 34)");
    expect(root.style.background).toBe("rgb(250, 250, 250)");
  });
});

describe("getTemplate", () => {
  it("falls back to the onyx definition for unimplemented templates", () => {
    const definition = getTemplate("persian");
    const doc = createEmptyResume();
    doc.summary.content = "<p>Fallback summary</p>";

    expect(definition.id).toBe("onyx");
    expect(TEMPLATES.onyx).toBe(definition);

    const Component = definition.Component;
    render(<Component doc={doc} pages={[["summary"]]} pageIndex={0} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Summary" }),
    ).toBeInTheDocument();
  });
});
