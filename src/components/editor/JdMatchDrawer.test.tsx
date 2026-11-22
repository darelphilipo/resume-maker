import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { SkillItemSchema } from "@/lib/schema/resume.schema";

import { JdMatchDrawer } from "./JdMatchDrawer";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function installDesktopViewport(): void {
  window.matchMedia = ((query: string) => ({
    matches: query === "(min-width: 1024px)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
}

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

  it("opens the compact sheet at its natural height with a keyboard press", async () => {
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} compact />);

    const trigger = screen.getByRole("button", {
      name: "Match to a job description",
    });

    trigger.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog");

    // No snap points: a short sheet is not translated most of the way below
    // the viewport, which made the live drawer look like it never opened.
    expect(dialog).toHaveAttribute("data-vaul-snap-points", "false");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Job description")).toBeInTheDocument();
  });

  it("closes from a single click on the X", async () => {
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} compact />);

    const trigger = screen.getByRole("button", {
      name: "Match to a job description",
    });

    await user.click(trigger);
    await screen.findByRole("dialog");

    const close = screen.getByRole("button", { name: "Close drawer" });

    expect(close).toHaveAttribute("data-vaul-no-drag");

    // One click must close the sheet outright. The X goes through Vaul's own
    // Drawer.Close, so the internal close path also resets the active snap
    // point instead of leaving the sheet at a minimized bar.
    fireEvent.click(close);

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await user.click(trigger);

    const reopened = await screen.findByRole("dialog");

    expect(reopened).toHaveAttribute("data-vaul-snap-points", "false");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("uses a centred modal on desktop so one tap on X closes it outright", async () => {
    installDesktopViewport();
    const user = userEvent.setup();

    render(<JdMatchDrawer doc={buildDoc()} compact />);

    const trigger = screen.getByRole("button", {
      name: "Match to a job description",
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");

    // A centred, portalled modal has no Vaul snap point to collapse back to.
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).not.toHaveAttribute("data-vaul-snap-points");
    expect(dialog.parentElement).toHaveAttribute("data-centered-modal");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Job description")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

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
