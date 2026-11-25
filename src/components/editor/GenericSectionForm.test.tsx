import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { ProfileItem } from "@/lib/schema/resume.schema";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { GenericSectionForm } from "./GenericSectionForm";

function makeItem(
  id: string,
  overrides: Partial<ProfileItem> = {},
): ProfileItem {
  return {
    id,
    hidden: false,
    network: "",
    username: "",
    url: "",
    icon: "",
    ...overrides,
  };
}

function setup(items: ProfileItem[]): void {
  resetResumeStore();
  const doc = createEmptyResume();
  doc.sections.profiles.items = items;
  useResumeStore.setState({ doc });
}

function flushCommit(): void {
  act(() => {
    vi.advanceTimersByTime(50);
  });
}

describe("GenericSectionForm profiles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setup([makeItem("profile-1")]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the URL and hides the manual icon field", () => {
    render(<GenericSectionForm sectionId="profiles" />);

    expect(screen.getByLabelText("Profile URL")).toHaveAttribute(
      "placeholder",
      "Paste GitHub or LinkedIn URL — auto-fills below",
    );
    expect(screen.getByLabelText("Network")).toBeInTheDocument();
    expect(screen.queryByLabelText("Icon")).toBeNull();
  });

  it("fills network, username, and icon from a pasted profile URL", () => {
    render(<GenericSectionForm sectionId="profiles" />);

    fireEvent.change(screen.getByLabelText("Profile URL"), {
      target: { value: "https://www.linkedin.com/in/ada" },
    });

    flushCommit();

    const item = useResumeStore.getState().doc.sections.profiles.items[0];

    expect(item).toMatchObject({
      network: "LinkedIn",
      username: "ada",
      icon: "linkedin",
      url: "https://www.linkedin.com/in/ada",
    });
  });

  it("keeps a hand-typed network when the URL changes", () => {
    render(<GenericSectionForm sectionId="profiles" />);

    fireEvent.change(screen.getByLabelText("Network"), {
      target: { value: "Work GitHub" },
    });
    fireEvent.change(screen.getByLabelText("Profile URL"), {
      target: { value: "github.com/ada" },
    });

    flushCommit();

    const item = useResumeStore.getState().doc.sections.profiles.items[0];

    expect(item.network).toBe("Work GitHub");
    expect(item.username).toBe("ada");
    expect(item.icon).toBe("github");
  });

  it("replaces a previously derived network with the new one", () => {
    render(<GenericSectionForm sectionId="profiles" />);

    fireEvent.change(screen.getByLabelText("Profile URL"), {
      target: { value: "github.com/ada" },
    });
    flushCommit();

    fireEvent.change(screen.getByLabelText("Profile URL"), {
      target: { value: "https://dribbble.com/ada" },
    });
    flushCommit();

    const item = useResumeStore.getState().doc.sections.profiles.items[0];

    expect(item).toMatchObject({
      network: "Dribbble",
      username: "ada",
      icon: "dribbble",
    });
  });

  it("leaves the fields alone for an unknown personal website", () => {
    render(<GenericSectionForm sectionId="profiles" />);

    fireEvent.change(screen.getByLabelText("Network"), {
      target: { value: "Portfolio" },
    });
    fireEvent.change(screen.getByLabelText("Profile URL"), {
      target: { value: "https://ada.dev" },
    });

    flushCommit();

    const item = useResumeStore.getState().doc.sections.profiles.items[0];

    expect(item).toMatchObject({
      network: "Portfolio",
      username: "",
      icon: "",
      url: "https://ada.dev",
    });
  });
});
