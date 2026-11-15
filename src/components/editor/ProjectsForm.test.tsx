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

  it("renders project dates as month pickers with canonical values", () => {
    setup([
      makeItem("project-1", {
        name: "Ledger API",
        startDate: "2023-02",
        endDate: "2023-11",
      }),
    ]);

    render(<ProjectsForm />);

    const startDate = screen.getByLabelText("Start date");
    const endDate = screen.getByLabelText("End date");

    expect(startDate).toHaveAttribute("type", "month");
    expect(endDate).toHaveAttribute("type", "month");
    expect(startDate).toHaveValue("2023-02");
    expect(endDate).toHaveValue("2023-11");
  });

  it("normalizes imported ISO dates to their month", () => {
    setup([
      makeItem("project-1", {
        startDate: "2023-02-15",
        endDate: "2023-11-30",
      }),
    ]);

    render(<ProjectsForm />);

    expect(screen.getByLabelText("Start date")).toHaveValue("2023-02");
    expect(screen.getByLabelText("End date")).toHaveValue("2023-11");
  });

  it("commits months selected from the picker", () => {
    setup([makeItem("project-1")]);
    render(<ProjectsForm />);

    fireEvent.change(screen.getByLabelText("Start date"), {
      target: { value: "2024-03" },
    });
    fireEvent.change(screen.getByLabelText("End date"), {
      target: { value: "2024-08" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const item = useResumeStore.getState().doc.sections.projects.items[0];

    expect(item.startDate).toBe("2024-03");
    expect(item.endDate).toBe("2024-08");
  });
});
