import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  resetResumeStore,
  undo,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { ResumeLintPopover } from "./ResumeLintPopover";

function openCheck(): void {
  fireEvent.click(
    screen.getByRole("button", { name: /Bullet polish:/ }),
  );
}

beforeEach(() => {
  resetResumeStore();
});

describe("ResumeLintPopover", () => {
  it("stays quiet when the bullets are clean", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li><li>Led the team.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);

    const trigger = screen.getByRole("button", {
      name: "Bullet polish: no issues",
    });

    expect(trigger).toHaveTextContent("Bullet polish");
    expect(trigger).not.toHaveTextContent("(");

    fireEvent.click(trigger);

    expect(
      screen.getByRole("region", { name: "Bullet polish" }),
    ).toHaveTextContent("No bullet issues found.");
  });

  it("shows the issue count and lists each finding with a snippet", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>I built the API.</li><li>Successfully shipped it.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);

    const trigger = screen.getByRole("button", {
      name: "Bullet polish: 2 issues",
    });

    expect(trigger).toHaveTextContent("Bullet polish (2)");

    fireEvent.click(trigger);

    const panel = screen.getByRole("region", { name: "Bullet polish" });

    expect(panel).toHaveTextContent("First-person pronouns");
    expect(panel).toHaveTextContent("Filler adverbs");
    expect(panel).toHaveTextContent("I built the API.");
  });

  it("removes trailing periods through the store and can be undone", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li><li>Led the team.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openCheck();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove all trailing periods" }),
    );

    expect(useResumeStore.getState().doc.summary.content).toBe(
      "<ul><li>Built APIs</li><li>Led the team</li></ul>",
    );

    undo();

    expect(useResumeStore.getState().doc.summary.content).toBe(
      "<ul><li>Built APIs.</li><li>Led the team.</li></ul>",
    );
  });

  it("adds periods to bullets that have none", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs</li><li>Led the team</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openCheck();
    fireEvent.click(
      screen.getByRole("button", { name: "Add periods to all bullets" }),
    );

    expect(useResumeStore.getState().doc.summary.content).toBe(
      "<ul><li>Built APIs.</li><li>Led the team.</li></ul>",
    );
    expect(
      screen.getByText("Added periods to bullets. Undo with Ctrl+Z if needed."),
    ).toBeVisible();
  });

  it("disables the period actions when there are no bullets", () => {
    const doc = createEmptyResume();

    useResumeStore.getState().setDoc(doc);
    render(<ResumeLintPopover doc={doc} />);
    openCheck();

    expect(
      screen.getByRole("button", { name: "Remove all trailing periods" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Add periods to all bullets" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("region", { name: "Bullet polish" }),
    ).toHaveTextContent("Add a bullet to a section first.");
  });

  it("closes on Escape", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openCheck();

    expect(
      screen.getByRole("region", { name: "Bullet polish" }),
    ).toBeVisible();

    fireEvent.keyDown(screen.getByRole("button", { name: /Bullet polish:/ }), {
      key: "Escape",
    });

    expect(
      screen.queryByRole("region", { name: "Bullet polish" }),
    ).not.toBeInTheDocument();
  });

  it("de-emphasizes the trigger and clamps the panel to the viewport", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);

    const trigger = screen.getByRole("button", { name: /Bullet polish:/ });

    // A quiet text trigger must not look like a second primary CTA.
    expect(trigger.className).not.toContain("border-line");
    expect(trigger.className).toContain("font-medium");

    fireEvent.click(trigger);

    const panel = screen.getByRole("region", { name: "Bullet polish" });

    // Fixed with inset gutters on phones, then a right-aligned popover at lg.
    expect(panel.className).toContain("fixed");
    expect(panel.className).toContain("inset-x-4");
    expect(panel.className).toContain("lg:absolute");
    expect(panel.className).toContain("lg:right-0");

    fireEvent.click(
      screen.getByRole("button", { name: "Close bullet polish" }),
    );

    expect(
      screen.queryByRole("region", { name: "Bullet polish" }),
    ).not.toBeInTheDocument();
  });
});
