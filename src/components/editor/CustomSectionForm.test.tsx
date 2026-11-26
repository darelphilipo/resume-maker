import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { CustomSectionForm } from "./CustomSectionForm";

vi.mock("./RichTextField", () => ({
  RichTextField: ({
    ariaLabel,
    label,
  }: {
    ariaLabel: string;
    label?: string;
  }) => <div data-testid="rich-text" aria-label={ariaLabel}>{label}</div>,
}));

describe("CustomSectionForm", () => {
  it("labels the description field like every other editor field", () => {
    resetResumeStore();
    const doc = createEmptyResume();
    doc.customSections = [
      {
        id: "custom-1",
        title: "Extras",
        icon: "",
        columns: 1,
        hidden: false,
        showHeading: true,
        keepTogether: false,
        startOnNewPage: false,
        items: [
          {
            id: "custom-item-1",
            hidden: false,
            name: "Conference talk",
            description: "",
            date: "",
            location: "",
            url: "",
          },
        ],
      },
    ];
    useResumeStore.setState({ doc });

    render(<CustomSectionForm sectionId="custom-1" />);

    expect(screen.getByTestId("rich-text")).toHaveTextContent("Description");
  });
});
