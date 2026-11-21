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
    screen.getByRole("button", { name: /Resume check:/ }),
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
      name: "Resume check: no issues",
    });

    expect(trigger).toHaveTextContent("Check");
    expect(trigger).not.toHaveTextContent("(");

    fireEvent.click(trigger);

    expect(
      screen.getByRole("region", { name: "Resume check" }),
    ).toHaveTextContent("No bullet issues found.");
  });

  it("shows the issue count and lists each finding with a snippet", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>I built the API.</li><li>Successfully shipped it.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);

    const trigger = screen.getByRole("button", {
      name: "Resume check: 2 issues",
    });

    expect(trigger).toHaveTextContent("Check (2)");

    fireEvent.click(trigger);

    const panel = screen.getByRole("region", { name: "Resume check" });

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
      screen.getByRole("region", { name: "Resume check" }),
    ).toHaveTextContent("Add a bullet to a section first.");
  });

  it("closes on Escape", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openCheck();

    expect(
      screen.getByRole("region", { name: "Resume check" }),
    ).toBeVisible();

    fireEvent.keyDown(screen.getByRole("button", { name: /Resume check:/ }), {
      key: "Escape",
    });

    expect(
      screen.queryByRole("region", { name: "Resume check" }),
    ).not.toBeInTheDocument();
  });
});
