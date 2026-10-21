import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { ExperienceItem } from "@/lib/schema/resume.schema";
import { selectVisibleSectionIds } from "@/lib/store/selectors";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { ExperienceForm } from "./ExperienceForm";

vi.mock("./RichTextField", () => ({
  RichTextField: ({ ariaLabel }: { ariaLabel: string }) => (
    <div data-testid="rich-text" aria-label={ariaLabel} />
  ),
}));

function makeItem(
  id: string,
  overrides: Partial<ExperienceItem> = {},
): ExperienceItem {
  return {
    id,
    hidden: false,
    company: "",
    position: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    summary: "",
    ...overrides,
  };
}

function setup(items: ExperienceItem[]): void {
  resetResumeStore();
  const doc = createEmptyResume();
  doc.sections.experience.items = items;
  useResumeStore.setState({ doc });
}

describe("ExperienceForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits a typed company after 50ms", () => {
    setup([makeItem("exp-1")]);
    render(<ExperienceForm />);

    fireEvent.change(screen.getByLabelText("Company"), {
      target: { value: "Acme" },
    });

    expect(useResumeStore.getState().doc.sections.experience.items[0].company).toBe(
      "",
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(useResumeStore.getState().doc.sections.experience.items[0].company).toBe(
      "Acme",
    );
  });

  it("coalesces rapid typing into one patchDoc call", () => {
    setup([makeItem("exp-1")]);
    const patchSpy = vi.spyOn(useResumeStore.getState(), "patchDoc");

    render(<ExperienceForm />);

    const company = screen.getByLabelText("Company");

    fireEvent.change(company, { target: { value: "A" } });
    fireEvent.change(company, { target: { value: "Ac" } });
    fireEvent.change(company, { target: { value: "Acme" } });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(patchSpy).toHaveBeenCalledTimes(1);
    expect(
      useResumeStore.getState().doc.sections.experience.items[0].company,
    ).toBe("Acme");
  });

  it("adds an entry with an empty primary field", () => {
    setup([makeItem("exp-1", { company: "Acme" })]);
    render(<ExperienceForm />);

    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const items = useResumeStore.getState().doc.sections.experience.items;

    expect(items).toHaveLength(2);
    expect(items[1].company).toBe("");
  });

  it("deletes an entry after inline confirmation", () => {
    setup([makeItem("exp-1", { company: "Acme" })]);
    render(<ExperienceForm />);

    fireEvent.click(screen.getByRole("button", { name: "Delete entry 1" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm delete entry 1" }),
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(
      useResumeStore.getState().doc.sections.experience.items,
    ).toHaveLength(0);
  });

  it("reorders entries", () => {
    setup([
      makeItem("exp-1", { company: "Acme" }),
      makeItem("exp-2", { company: "Beta" }),
    ]);
    render(<ExperienceForm />);

    fireEvent.click(screen.getByRole("button", { name: "Move up entry 2" }));

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const companies = useResumeStore
      .getState()
      .doc.sections.experience.items.map((item) => item.company);

    expect(companies).toEqual(["Beta", "Acme"]);
  });

  it("clears sample data and disables the button when empty", () => {
    setup([
      makeItem("exp-1", { company: "Acme" }),
      makeItem("exp-2", { company: "Beta" }),
    ]);
    render(<ExperienceForm />);

    const clear = screen.getByRole("button", { name: "Clear sample data" });

    expect(clear).toBeEnabled();
    fireEvent.click(clear);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(
      useResumeStore.getState().doc.sections.experience.items,
    ).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Clear sample data" }),
    ).toBeDisabled();
  });

  it("keeps drafts in the form but filters them from visible sections", () => {
    setup([makeItem("exp-1", { company: "", position: "Engineer" })]);

    render(<ExperienceForm />);

    expect(screen.getByLabelText("Company")).toHaveValue("");

    expect(
      selectVisibleSectionIds({ doc: useResumeStore.getState().doc }),
    ).not.toContain("experience");
  });
});
