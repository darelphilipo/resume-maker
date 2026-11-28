import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";
import {
  resetResumeStore,
  undo,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { ResumeLintPopover } from "./ResumeLintPopover";

function openTidy(): void {
  fireEvent.click(screen.getByRole("button", { name: /Tidy:/ }));
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
      name: "Tidy: no issues",
    });

    expect(trigger).toHaveTextContent("Tidy");
    expect(trigger).toHaveAttribute(
      "title",
      "Checks bullet periods, repeated verbs, and filler words.",
    );
    expect(document.querySelector("[data-lint-count]")).toBeNull();
    expect(trigger).toHaveClass("h-8", "px-2.5", "text-xs", "whitespace-nowrap");

    fireEvent.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Tidy bullets" }),
    ).toHaveTextContent("No bullet issues found.");
    expect(
      screen.getByRole("heading", { name: "Tidy bullets" }),
    ).toHaveClass("font-serif");
  });

  it("shows a compact count badge and bordered finding cards", () => {
    const doc = createEmptyResume();

    doc.summary.content =
      "<ul><li>I built the API.</li><li>Successfully shipped it.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);

    const trigger = screen.getByRole("button", {
      name: "Tidy: 2 issues",
    });

    expect(trigger).toHaveTextContent("Tidy");
    expect(document.querySelector("[data-lint-count]")).toHaveTextContent("2");

    fireEvent.click(trigger);

    const panel = screen.getByRole("dialog", { name: "Tidy bullets" });

    expect(panel).toHaveTextContent("Quick local checks to tidy your bullets.");
    expect(panel).not.toHaveTextContent("deterministic");
    for (const id of ["first-person", "filler"]) {
      const card = panel.querySelector(`[data-lint-card="${id}"]`);
      expect(card).toHaveClass("rounded-lg", "border", "border-line");
      expect(card).toHaveTextContent(
        id === "first-person" ? "First-person pronouns" : "Filler adverbs",
      );
    }
    expect(panel).toHaveTextContent("I built the API.");
  });

  it("removes trailing periods from inside the mixed-periods card and can undo", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li><li>Led the team</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openTidy();

    const card = screen
      .getByRole("dialog", { name: "Tidy bullets" })
      .querySelector('[data-lint-card="mixed-periods"]');
    expect(card).toHaveTextContent("Mixed bullet periods");
    expect(card).toContainElement(
      screen.getByRole("button", { name: "Remove periods" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove periods" }));

    expect(useResumeStore.getState().doc.summary.content).toBe(
      "<ul><li>Built APIs</li><li>Led the team</li></ul>",
    );

    undo();

    expect(useResumeStore.getState().doc.summary.content).toBe(
      "<ul><li>Built APIs.</li><li>Led the team</li></ul>",
    );
  });

  it("adds periods to bullets that have none", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs</li><li>Led the team</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openTidy();
    fireEvent.click(screen.getByRole("button", { name: "Add periods" }));

    expect(useResumeStore.getState().doc.summary.content).toBe(
      "<ul><li>Built APIs.</li><li>Led the team.</li></ul>",
    );
    expect(
      screen.getByText("Added periods to bullets. Undo with Ctrl+Z if needed."),
    ).toBeVisible();
  });

  it("explains an empty resume instead of offering period actions", () => {
    const doc = createEmptyResume();

    useResumeStore.getState().setDoc(doc);
    render(<ResumeLintPopover doc={doc} />);
    openTidy();

    expect(
      screen.getByRole("dialog", { name: "Tidy bullets" }),
    ).toHaveTextContent("Add a bullet to a section first.");
    expect(
      screen.queryByRole("button", { name: "Remove periods" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Add periods" })).toBeNull();
  });

  it("groups repeated verbs into one card with a jump-to-entry link", () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-tidy",
        company: "Acme",
        position: "Engineer",
        summary:
          "<ul><li>Collected data.</li><li>Collected reports.</li><li>Maintained dashboards.</li><li>Maintained pipelines.</li></ul>",
      }),
    ];
    useResumeStore.getState().setDoc(doc);

    const onJumpToEntry = vi.fn();
    render(<ResumeLintPopover doc={doc} onJumpToEntry={onJumpToEntry} />);
    openTidy();

    const card = screen
      .getByRole("dialog", { name: "Tidy bullets" })
      .querySelector('[data-lint-card="repeated-verbs"]') as HTMLElement;

    expect(card).toHaveTextContent("Repeated opening verbs");
    expect(card).toHaveTextContent("Collected ×2");
    expect(card).toHaveTextContent("Maintained ×2");
    // No walls of quoted bullets in this card.
    expect(card.textContent).not.toContain("“");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Jump to entry for repeated “Collected” bullets",
      }),
    );

    expect(onJumpToEntry).toHaveBeenCalledWith({
      sectionId: "experience",
      entryId: "exp-tidy",
    });
    expect(
      screen.queryByRole("dialog", { name: "Tidy bullets" }),
    ).not.toBeInTheDocument();
  });

  it("closes on Escape", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openTidy();

    expect(
      screen.getByRole("dialog", { name: "Tidy bullets" }),
    ).toBeVisible();

    fireEvent.keyDown(screen.getByRole("button", { name: /Tidy:/ }), {
      key: "Escape",
    });

    expect(
      screen.queryByRole("dialog", { name: "Tidy bullets" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the trigger a quiet pill and opens a centred, portalled modal", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    const trigger = screen.getByRole("button", { name: /Tidy:/ });

    // A quiet pill must not look like a second primary CTA.
    expect(trigger.className).toContain("rounded-full");
    expect(trigger.className).toContain("border-line");
    expect(trigger.className).toContain("bg-surface");
    expect(trigger.className).toContain("font-medium");
    expect(trigger.className).not.toContain("bg-primary");

    fireEvent.click(trigger);

    const panel = screen.getByRole("dialog", { name: "Tidy bullets" });
    const overlay = panel.parentElement;

    // Centred modal portalled to the body, never an anchored popover in the
    // narrow left column that can extend past the left viewport edge.
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(overlay).toHaveAttribute("data-centered-modal");
    expect(overlay?.parentElement).toBe(document.body);
    expect(overlay?.className).toContain("items-center");
    expect(overlay?.className).toContain("justify-center");
    expect(panel.className).toContain("max-w-md");
    expect(panel.className).not.toContain("lg:absolute");
    expect(panel.className).not.toContain("lg:right-0");
    expect(overlay?.className).not.toContain("inset-x-4");

    fireEvent.click(
      screen.getByRole("button", { name: "Close tidy bullets" }),
    );

    expect(
      screen.queryByRole("dialog", { name: "Tidy bullets" }),
    ).not.toBeInTheDocument();
  });

  it("closes from a tap on the backdrop", () => {
    const doc = createEmptyResume();

    doc.summary.content = "<ul><li>Built APIs.</li></ul>";
    useResumeStore.getState().setDoc(doc);

    render(<ResumeLintPopover doc={doc} />);
    openTidy();

    const panel = screen.getByRole("dialog", { name: "Tidy bullets" });

    fireEvent.click(panel);

    // A tap inside the dialog must not dismiss it.
    expect(
      screen.getByRole("dialog", { name: "Tidy bullets" }),
    ).toBeInTheDocument();

    fireEvent.click(panel.parentElement as HTMLElement);

    expect(
      screen.queryByRole("dialog", { name: "Tidy bullets" }),
    ).not.toBeInTheDocument();
  });
});
