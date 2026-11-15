import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { SkillItem } from "@/lib/schema/resume.schema";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { SkillsForm } from "./SkillsForm";

function makeItem(
  id: string,
  overrides: Partial<SkillItem> = {},
): SkillItem {
  return {
    id,
    hidden: false,
    name: "",
    level: 0,
    keywords: [],
    ...overrides,
  };
}

function setup(items: SkillItem[]): void {
  resetResumeStore();
  const doc = createEmptyResume();
  doc.sections.skills.items = items;
  useResumeStore.setState({ doc });
}

describe("SkillsForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a category and keywords instead of a proficiency slider", () => {
    setup([
      makeItem("skill-1", {
        name: "Languages",
        keywords: ["Python", "SQL"],
      }),
    ]);

    const { container } = render(<SkillsForm />);

    expect(screen.getByLabelText("Category")).toHaveValue("Languages");
    expect(screen.getByLabelText("Keywords")).toHaveValue("Python, SQL");
    expect(screen.queryByLabelText("Level")).toBeNull();
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it("commits the category and comma-separated keywords after 50ms", () => {
    setup([makeItem("skill-1", { name: "Languages", keywords: ["Python"] })]);
    render(<SkillsForm />);

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Tools" },
    });
    fireEvent.change(screen.getByLabelText("Keywords"), {
      target: { value: "Git, Docker, AWS" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const item = useResumeStore.getState().doc.sections.skills.items[0];

    expect(item.name).toBe("Tools");
    expect(item.keywords).toEqual(["Git", "Docker", "AWS"]);
  });

  it("keeps imported levels when editing a category", () => {
    setup([makeItem("skill-1", { name: "Languages", level: 4 })]);
    render(<SkillsForm />);

    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Programming" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(
      useResumeStore.getState().doc.sections.skills.items[0].level,
    ).toBe(4);
  });
});
