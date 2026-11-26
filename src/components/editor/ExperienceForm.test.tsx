import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

function setup(
  items: ExperienceItem[],
  options: { sampleData?: boolean } = {},
): void {
  resetResumeStore();
  const doc = createEmptyResume();
  doc.sections.experience.items = items;
  doc.metadata.sampleData = options.sampleData === true;
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

  it("keeps the moved entry's card and move button focused after a reorder", () => {
    setup([
      makeItem("exp-1", { company: "Acme" }),
      makeItem("exp-2", { company: "Beta" }),
      makeItem("exp-3", { company: "Gamma" }),
      makeItem("exp-4", { company: "Delta" }),
    ]);
    render(<ExperienceForm />);

    // Move the third entry up: its button stays enabled in the second slot.
    const gammaCard = screen.getByText("Entry 3").closest("fieldset");
    const gammaCompany = within(gammaCard as HTMLElement).getByLabelText(
      "Company",
    );
    const moveUp = within(gammaCard as HTMLElement).getByRole("button", {
      name: "Move up entry 3",
    });
    moveUp.focus();

    fireEvent.click(moveUp);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // The same DOM node is reused (stable `id` key), now in the second slot.
    const movedCard = screen.getByText("Entry 2").closest("fieldset");

    expect(
      within(movedCard as HTMLElement).getByLabelText("Company"),
    ).toBe(gammaCompany);
    expect(document.activeElement).toBe(
      within(movedCard as HTMLElement).getByRole("button", {
        name: "Move up entry 2",
      }),
    );
  });

  it("clears sample data and disables the button when empty", () => {
    setup(
      [
        makeItem("exp-1", { company: "Acme" }),
        makeItem("exp-2", { company: "Beta" }),
      ],
      { sampleData: true },
    );
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

  it("hides Clear sample data on an imported or blank resume", () => {
    setup([makeItem("exp-1", { company: "Acme" })]);
    render(<ExperienceForm />);

    expect(
      screen.queryByRole("button", { name: "Clear sample data" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add entry" }),
    ).toBeInTheDocument();
  });

  it("hides an entry with the eye toggle instead of deleting it", () => {
    setup([makeItem("exp-1", { company: "Acme" })]);
    render(<ExperienceForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Hide entry 1" }),
    );

    const card = screen.getByText("Entry 1").closest("fieldset");
    expect(card).toHaveClass("opacity-60");
    expect(
      screen.getByRole("button", { name: "Show entry 1" }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const items = useResumeStore.getState().doc.sections.experience.items;
    expect(items).toHaveLength(1);
    expect(items[0].hidden).toBe(true);
    // The entry stays in the form and in the saved document, but the preview
    // and ATS text drop it.
    expect(
      selectVisibleSectionIds({ doc: useResumeStore.getState().doc }),
    ).not.toContain("experience");

    fireEvent.click(
      screen.getByRole("button", { name: "Show entry 1" }),
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(
      useResumeStore.getState().doc.sections.experience.items[0].hidden,
    ).toBe(false);
    expect(
      selectVisibleSectionIds({ doc: useResumeStore.getState().doc }),
    ).toContain("experience");
  });

  it("sorts entries newest first and hides the button once ordered", () => {
    setup([
      makeItem("exp-1", {
        company: "Older",
        startDate: "2018-01",
        endDate: "2020-01",
      }),
      makeItem("exp-2", {
        company: "Current",
        startDate: "2023-01",
        endDate: "",
        current: true,
      }),
      makeItem("exp-3", {
        company: "Newer",
        startDate: "2021-01",
        endDate: "2022-01",
      }),
    ]);
    render(<ExperienceForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Sort newest first" }),
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const companies = useResumeStore
      .getState()
      .doc.sections.experience.items.map((item) => item.company);

    expect(companies).toEqual(["Current", "Newer", "Older"]);
    expect(
      screen.queryByRole("button", { name: "Sort newest first" }),
    ).toBeNull();
  });

  it("shows a date sanity warning when the end date precedes the start", () => {
    setup([
      makeItem("exp-1", {
        company: "Acme",
        startDate: "2024-06",
        endDate: "2024-05",
      }),
    ]);
    render(<ExperienceForm />);

    const warning = screen.getByText("End date is earlier than start date");

    expect(warning).toHaveClass("text-amber-700");
  });

  it("suppresses the date warning for a current role", () => {
    setup([
      makeItem("exp-1", {
        company: "Acme",
        startDate: "2024-06",
        endDate: "2024-05",
        current: true,
      }),
    ]);
    render(<ExperienceForm />);

    expect(
      screen.queryByText("End date is earlier than start date"),
    ).toBeNull();
  });

  it("saves the group-promotions option immediately", () => {
    setup([
      makeItem("exp-1", { company: "Acme", position: "Engineer" }),
      makeItem("exp-2", { company: "Acme", position: "Senior Engineer" }),
    ]);
    render(<ExperienceForm />);

    const toggle = screen.getByLabelText("Group promotions at the same company");

    expect(toggle).not.toBeChecked();
    expect(
      useResumeStore.getState().doc.sections.experience.groupSameCompany,
    ).toBe(false);

    fireEvent.click(toggle);

    expect(
      useResumeStore.getState().doc.sections.experience.groupSameCompany,
    ).toBe(true);
    expect(toggle).toBeChecked();
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
