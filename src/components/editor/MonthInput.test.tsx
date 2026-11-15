import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MonthInput } from "./SectionFormControls";

function renderInput(value: string, onChange = vi.fn()) {
  render(
    <MonthInput
      id="start-date"
      label="Start date"
      value={value}
      onChange={onChange}
    />,
  );

  return {
    input: screen.getByLabelText("Start date") as HTMLInputElement,
    onChange,
  };
}

describe("MonthInput", () => {
  it("shows the compact month label", () => {
    const { input } = renderInput("2023-10");

    expect(input).toHaveValue("Oct 2023");
  });

  it("stores the canonical value when typed as YYYY-MM", () => {
    const { input, onChange } = renderInput("");

    fireEvent.change(input, { target: { value: "2024-02" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("2024-02");
    expect(input).toHaveValue("Feb 2024");
  });

  it("parses a typed month name", () => {
    const { input, onChange } = renderInput("");

    fireEvent.change(input, { target: { value: "March 2024" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("2024-03");
    expect(input).toHaveValue("Mar 2024");
  });

  it("clears the value on blur", () => {
    const { input, onChange } = renderInput("2023-10");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("");
    expect(input).toHaveValue("");
  });

  it("keeps unparseable text so no input is lost", () => {
    const { input, onChange } = renderInput("");

    fireEvent.change(input, { target: { value: "Spring 2024" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledWith("Spring 2024");
    expect(input).toHaveValue("Spring 2024");
  });

  it("reacts to an external value change", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MonthInput
        id="start-date"
        label="Start date"
        value="2023-10"
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Start date") as HTMLInputElement;

    expect(input).toHaveValue("Oct 2023");

    rerender(
      <MonthInput
        id="start-date"
        label="Start date"
        value="2024-01"
        onChange={onChange}
      />,
    );

    expect(input).toHaveValue("Jan 2024");
  });
});
