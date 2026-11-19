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

  it("wires the trigger to the drawer portal through the dialog primitive", async () => {
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} />);

    const trigger = screen.getByRole("button", {
      name: "Match to a job description",
    });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
  });

  it("keeps the same trigger contract in its compact header variant", async () => {
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} compact />);

    const trigger = screen.getByRole("button", {
      name: "Match to a job description",
    });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveClass("shrink-0");
    expect(trigger).not.toHaveClass("w-full");

    await user.click(trigger);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
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
