import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  EntryCard,
  MonthInput,
  TextInput,
} from "./SectionFormControls";

describe("SectionFormControls", () => {
  it("renders text inputs on a white surface with a readable placeholder", () => {
    render(
      <TextInput
        id="basics-work-auth"
        label="Work auth / notice period"
        value=""
        onChange={vi.fn()}
        placeholder="Authorized to work in US"
        hint="Optional one-liner shown in the header. Keep it short."
      />,
    );

    const input = screen.getByLabelText("Work auth / notice period");

    expect(input).toHaveClass(
      "bg-surface",
      "text-text",
      "border-line",
      "placeholder:text-muted",
      "placeholder:opacity-100",
    );
    expect(input).toHaveAttribute("placeholder", "Authorized to work in US");
  });

  it("renders hints with the muted token instead of translucent text", () => {
    render(
      <TextInput
        id="basics-picture-url"
        label="Picture URL"
        value=""
        onChange={vi.fn()}
        hint="Optional headshot URL."
      />,
    );

    const hint = screen.getByText("Optional headshot URL.");

    expect(hint).toHaveClass("text-muted");
    expect(hint).not.toHaveClass("opacity-60");
  });

  it("keeps the compact month input on the same white input surface", () => {
    render(
      <MonthInput
        id="start-date"
        label="Start date"
        value="2023-10"
        onChange={vi.fn()}
        hint="Month is enough."
      />,
    );

    const input = screen.getByLabelText("Start date");

    expect(input).toHaveClass("bg-surface", "text-text", "border-line");
    expect(screen.getByText("Month is enough.")).toHaveClass("text-muted");
  });

  it("tints entry cards so nested white inputs stand out", () => {
    render(
      <EntryCard index={0}>
        <TextInput
          id="entry-name"
          label="Entry name"
          value=""
          onChange={vi.fn()}
        />
      </EntryCard>,
    );

    const card = screen.getByText("Entry 1").closest("fieldset");
    const input = screen.getByLabelText("Entry name");

    expect(card).toHaveClass("bg-surface-muted", "border-line");
    expect(input).toHaveClass("bg-surface");
  });
});
