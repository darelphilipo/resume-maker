import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { ProjectItem } from "@/lib/schema/resume.schema";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { ProjectsForm } from "./ProjectsForm";

vi.mock("./RichTextField", () => ({
  RichTextField: ({ ariaLabel }: { ariaLabel: string }) => (
    <div data-testid="rich-text" aria-label={ariaLabel} />
  ),
}));

function makeItem(
  id: string,
  overrides: Partial<ProjectItem> = {},
): ProjectItem {
  return {
    id,
    hidden: false,
    name: "",
    description: "",
    url: "",
    startDate: "",
    endDate: "",
    keywords: [],
    ...overrides,
  };
}

function setup(items: ProjectItem[]): void {
  resetResumeStore();
  const doc = createEmptyResume();
  doc.sections.projects.items = items;
  useResumeStore.setState({ doc });
}

describe("ProjectsForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders project dates with the shared month and year selector", () => {
    setup([
      makeItem("project-1", {
        name: "Ledger API",
        startDate: "2023-02",
        endDate: "2023-11",
      }),
    ]);

    render(<ProjectsForm />);

    const startMonth = screen.getByLabelText("Start date month");
    const startYear = screen.getByLabelText("Start date year");
    const endMonth = screen.getByLabelText("End date month");
    const endYear = screen.getByLabelText("End date year");

    expect(startMonth).toHaveValue("02");
    expect(startYear).toHaveValue("2023");
    expect(endMonth).toHaveValue("11");
    expect(endYear).toHaveValue("2023");
    expect(document.querySelector('input[type="month"]')).toBeNull();
  });

  it("normalizes imported ISO dates to their month", () => {
    setup([
      makeItem("project-1", {
        startDate: "2023-02-15",
        endDate: "2023-11-30",
      }),
    ]);

    render(<ProjectsForm />);

    expect(screen.getByLabelText("Start date month")).toHaveValue("02");
    expect(screen.getByLabelText("Start date year")).toHaveValue("2023");
    expect(screen.getByLabelText("End date month")).toHaveValue("11");
    expect(screen.getByLabelText("End date year")).toHaveValue("2023");
  });

  it("commits months selected from the selector", () => {
    setup([makeItem("project-1")]);
    render(<ProjectsForm />);

    fireEvent.change(screen.getByLabelText("Start date year"), {
      target: { value: "2024" },
    });
    fireEvent.change(screen.getByLabelText("Start date month"), {
      target: { value: "03" },
    });
    fireEvent.change(screen.getByLabelText("End date year"), {
      target: { value: "2024" },
    });
    fireEvent.change(screen.getByLabelText("End date month"), {
      target: { value: "08" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const item = useResumeStore.getState().doc.sections.projects.items[0];

    expect(item.startDate).toBe("2024-03");
    expect(item.endDate).toBe("2024-08");
  });

  it("sorts projects newest first and commits the order", () => {
    setup([
      makeItem("project-1", {
        name: "Older",
        startDate: "2019-01",
        endDate: "2020-01",
      }),
      makeItem("project-2", {
        name: "Newer",
        startDate: "2022-01",
        endDate: "2023-01",
      }),
    ]);
    render(<ProjectsForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Sort newest first" }),
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(
      useResumeStore
        .getState()
        .doc.sections.projects.items.map((item) => item.name),
    ).toEqual(["Newer", "Older"]);
  });

  it("warns under End date when the range is reversed", () => {
    setup([
      makeItem("project-1", {
        name: "Ledger API",
        startDate: "2024-06",
        endDate: "2024-02",
      }),
    ]);
    render(<ProjectsForm />);

    expect(
      screen.getByText("End date is earlier than start date"),
    ).toBeInTheDocument();
  });
});
