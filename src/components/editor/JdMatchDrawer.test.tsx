import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { SkillItemSchema } from "@/lib/schema/resume.schema";

import { JdMatchDrawer } from "./JdMatchDrawer";

function buildDoc() {
  const doc = createEmptyResume();

  doc.basics.name = "Ada Lovelace";
  doc.sections.skills.items = [
    SkillItemSchema.parse({
      id: "skill-1",
      name: "Languages",
      keywords: ["TypeScript", "React"],
    }),
  ];

  return doc;
}

describe("JdMatchDrawer", () => {
  it("keeps the drawer closed until the trigger is pressed", async () => {
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} />);

    expect(
      screen.getByRole("button", { name: "Match to a job description" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Match to a job description" }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Job description")).toBeInTheDocument();
  });

  it("splits pasted job keywords into matched and missing chips", async () => {
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} />);

    await user.click(
      screen.getByRole("button", { name: "Match to a job description" }),
    );
    fireEvent.change(screen.getByLabelText("Job description"), {
      target: { value: "TypeScript, React, and Kubernetes." },
    });

    expect(
      screen.getByText("2 of 3 keywords matched (67%)"),
    ).toBeInTheDocument();

    const matched = screen.getByRole("list", { name: "Matched" });
    const missing = screen.getByRole("list", { name: "Missing" });

    expect(within(matched).getByText("typescript")).toBeInTheDocument();
    expect(within(matched).getByText("react")).toBeInTheDocument();
    expect(within(missing).getByText("kubernetes")).toBeInTheDocument();
  });

  it("explains the empty state before a job description is pasted", async () => {
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} />);

    await user.click(
      screen.getByRole("button", { name: "Match to a job description" }),
    );

    expect(
      screen.getByText(/No keywords yet\. Paste a job description/),
    ).toBeInTheDocument();
  });
});
