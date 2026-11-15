import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

import { AtsTextView } from "./AtsTextView";

describe("AtsTextView", () => {
  it("renders the extracted resume text in a labelled plain-text block", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.basics.headline = "Software Engineer";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Senior Engineer",
      }),
    ];

    render(<AtsTextView doc={doc} />);

    const preview = screen.getByLabelText("ATS plain text preview");

    expect(preview.tagName).toBe("PRE");
    expect(preview).toHaveTextContent("Ada Lovelace");
    expect(preview).toHaveTextContent("Senior Engineer");
    expect(preview).toHaveTextContent("Acme");
  });

  it("explains how to populate an empty view", () => {
    render(<AtsTextView doc={createEmptyResume()} />);

    expect(
      screen.getByLabelText("ATS plain text preview"),
    ).toHaveTextContent(
      "Nothing to extract yet. Add your name and at least one section.",
    );
  });
});
