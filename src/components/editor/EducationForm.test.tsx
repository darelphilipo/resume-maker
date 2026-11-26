import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { EducationItem } from "@/lib/schema/resume.schema";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { EducationForm } from "./EducationForm";

vi.mock("./RichTextField", () => ({
  RichTextField: ({
    ariaLabel,
    label,
  }: {
    ariaLabel: string;
    label?: string;
  }) => (
    <div data-testid="rich-text" aria-label={ariaLabel} data-label={label} />
  ),
}));

function makeItem(
  id: string,
  overrides: Partial<EducationItem> = {},
): EducationItem {
  return {
    id,
    hidden: false,
    school: "",
    degree: "",
    area: "",
    location: "",
    startDate: "",
    endDate: "",
    grade: "",
    summary: "",
    current: false,
    ...overrides,
  };
}

function setup(items: EducationItem[]): void {
  resetResumeStore();
  const doc = createEmptyResume();
  doc.sections.education.items = items;
  useResumeStore.setState({ doc });
}

describe("EducationForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels the education summary field", () => {
    setup([makeItem("edu-1")]);
    render(<EducationForm />);

    expect(screen.getByTestId("rich-text")).toHaveAttribute(
      "data-label",
      "Summary",
    );
  });

  it("uses region-neutral location and grade placeholders", () => {
    setup([makeItem("edu-1")]);
    render(<EducationForm />);

    expect(screen.getByLabelText("Location")).toHaveAttribute(
      "placeholder",
      "City, Country",
    );
    expect(screen.getByLabelText("Grade")).toHaveAttribute(
      "placeholder",
      "3.8 GPA / 8.5 CGPA",
    );
  });

  it("sorts schools newest first and hides the button once ordered", () => {
    setup([
      makeItem("edu-1", {
        school: "Older University",
        startDate: "2014-09",
        endDate: "2018-06",
      }),
      makeItem("edu-2", {
        school: "Newest University",
        startDate: "2020-09",
        endDate: "2022-06",
      }),
      makeItem("edu-3", {
        school: "Ongoing University",
        startDate: "2023-09",
        current: true,
      }),
    ]);
    render(<EducationForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Sort newest first" }),
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(
      useResumeStore
        .getState()
        .doc.sections.education.items.map((item) => item.school),
    ).toEqual(["Ongoing University", "Newest University", "Older University"]);
    expect(
      screen.queryByRole("button", { name: "Sort newest first" }),
    ).toBeNull();
  });

  it("warns under End date when the range is reversed", () => {
    setup([
      makeItem("edu-1", {
        school: "Example University",
        startDate: "2022-09",
        endDate: "2022-05",
      }),
    ]);
    render(<EducationForm />);

    expect(
      screen.getByText("End date is earlier than start date"),
    ).toHaveClass("text-amber-700");
  });

  it("does not show the sort button for a single entry", () => {
    setup([makeItem("edu-1", { school: "Example University" })]);
    render(<EducationForm />);

    expect(
      screen.queryByRole("button", { name: "Sort newest first" }),
    ).toBeNull();
  });
});
