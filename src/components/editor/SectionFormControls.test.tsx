import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  EntryCard,
  MonthInput,
  MonthSelect,
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

describe("MonthSelect", () => {
  function renderSelect(
    value: string,
    extra: {
      present?: boolean;
      onPresentChange?: (present: boolean) => void;
      onChange?: (value: string) => void;
    } = {},
  ) {
    const onChange = extra.onChange ?? vi.fn();

    render(
      <MonthSelect
        id="start-date"
        label="Start date"
        value={value}
        onChange={onChange}
        present={extra.present}
        onPresentChange={extra.onPresentChange}
      />,
    );

    return {
      month: screen.getByLabelText("Start date month") as HTMLSelectElement,
      year: screen.getByLabelText("Start date year") as HTMLInputElement,
      onChange,
    };
  }

  it("shows canonical months in a select and the year in a numeric field", () => {
    const { month, year } = renderSelect("2023-10");

    expect(month).toHaveValue("10");
    expect(year).toHaveValue("2023");
    expect(month).toHaveClass("bg-surface", "min-h-11");
    expect(year).toHaveClass("bg-surface", "min-h-11");
    expect(year).toHaveAttribute("inputmode", "numeric");
  });

  it("never renders a native month input", () => {
    renderSelect("2023-10");

    expect(document.querySelector('input[type="month"]')).toBeNull();
  });

  it("updates the stored month when a month is chosen", () => {
    const { month, onChange } = renderSelect("2023-10");

    fireEvent.change(month, { target: { value: "02" } });

    expect(onChange).toHaveBeenCalledWith("2023-02");
  });

  it("updates the stored month when a four-digit year is typed", () => {
    const { year, onChange } = renderSelect("2023-10");

    fireEvent.change(year, { target: { value: "2024" } });

    expect(onChange).toHaveBeenCalledWith("2024-10");
  });

  it("waits for both parts before storing a new date", () => {
    const { month, year, onChange } = renderSelect("");

    fireEvent.change(year, { target: { value: "2024" } });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(month, { target: { value: "03" } });

    expect(onChange).toHaveBeenCalledWith("2024-03");
  });

  it("clears the date when the month is reset", () => {
    const { month, year, onChange } = renderSelect("2023-10");

    fireEvent.change(month, { target: { value: "" } });

    expect(onChange).toHaveBeenCalledWith("");
    expect(year).toHaveValue("");
  });

  it("offers a Present toggle for end dates and disables the picker", () => {
    const onPresentChange = vi.fn();
    const { month, year, onChange } = renderSelect("2023-10", {
      present: true,
      onPresentChange,
    });

    const present = screen.getByLabelText("Present");

    expect(present).toBeChecked();
    expect(month).toBeDisabled();
    expect(year).toBeDisabled();

    fireEvent.click(present);

    expect(onPresentChange).toHaveBeenCalledWith(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the Present toggle optional", () => {
    renderSelect("2023-10");

    expect(screen.queryByLabelText("Present")).not.toBeInTheDocument();
  });
});
