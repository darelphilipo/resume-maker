import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  EntryActions,
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
      "min-w-0",
      "placeholder:text-muted",
      "placeholder:opacity-100",
    );
    expect(input.parentElement).toHaveClass("min-w-0");
    expect(input).toHaveAttribute("placeholder", "Authorized to work in US");
  });

  it("cannot force horizontal overflow in the narrow Content column", () => {
    render(
      <TextInput
        id="basics-website-url"
        label="Website URL"
        value="https://example.com/a/very/long/path/that/never/ends"
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Website URL");

    expect(input).toHaveClass("w-full", "min-w-0");
    expect(input.parentElement).toHaveClass("flex", "min-w-0", "flex-col");
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

  it("keeps entry actions on one compact row in the narrow sidebar", () => {
    render(
      <EntryActions
        index={0}
        total={2}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const up = screen.getByRole("button", { name: "Move up entry 1" });
    const down = screen.getByRole("button", { name: "Move down entry 1" });
    const remove = screen.getByRole("button", { name: "Delete entry 1" });
    const row = up.parentElement;

    expect(row).toHaveClass("flex-nowrap");
    expect(row).not.toHaveClass("flex-wrap");

    for (const button of [up, down, remove]) {
      expect(button).toHaveClass(
        "min-h-9",
        "min-w-9",
        "shrink-0",
        "pointer-coarse:min-h-11",
        "pointer-coarse:min-w-11",
      );
    }

    // Delete keeps the same footprint but reads as destructive before confirm.
    expect(remove).toHaveClass(
      "text-red-700/80",
      "hover:bg-red-50",
      "hover:text-red-800",
    );
    expect(remove).not.toHaveClass("border-line");
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

  it("keeps focus and the scroll offset when a move reorders the DOM", () => {
    // A real Content column (or drawer body) is a scrollable ancestor. jsdom
    // has no layout, so stub the geometry the scroll helper reads.
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "scrollHeight", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(scroller, "clientHeight", {
      configurable: true,
      value: 300,
    });
    document.body.appendChild(scroller);

    let moveButton: HTMLButtonElement | null = null;

    // Simulate the browser falling back to `body` and clamping scrollTop when
    // the focused node is reinserted by the reorder.
    const onMoveUp = vi.fn(() => {
      scroller.scrollTop = 0;
      moveButton?.blur();
    });

    render(
      <EntryActions
        index={1}
        total={2}
        onMoveUp={onMoveUp}
        onMoveDown={vi.fn()}
        onDelete={vi.fn()}
      />,
      { container: scroller },
    );

    const up = screen.getByRole("button", {
      name: "Move up entry 2",
    }) as HTMLButtonElement;
    moveButton = up;
    scroller.scrollTop = 240;
    up.focus();

    fireEvent.click(up);

    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(scroller.scrollTop).toBe(240);
    expect(document.activeElement).toBe(up);

    scroller.remove();
  });

  it("restores every scrollable ancestor and re-focuses an enabled sibling", () => {
    // The desktop Content panel and a drawer body can both be scrollers; a
    // move at a boundary also disables the clicked Down button.
    const outer = document.createElement("div");
    const inner = document.createElement("div");
    outer.style.overflowY = "auto";
    inner.style.overflowY = "auto";

    for (const element of [outer, inner]) {
      Object.defineProperty(element, "scrollHeight", {
        configurable: true,
        value: 1000,
      });
      Object.defineProperty(element, "clientHeight", {
        configurable: true,
        value: 300,
      });
    }

    outer.appendChild(inner);
    document.body.appendChild(outer);

    const onMoveDown = vi.fn(() => {
      outer.scrollTop = 0;
      inner.scrollTop = 0;
    });

    render(
      <EntryActions
        index={0}
        total={2}
        onMoveUp={vi.fn()}
        onMoveDown={onMoveDown}
        onDelete={vi.fn()}
      />,
      { container: inner },
    );

    const down = screen.getByRole("button", {
      name: "Move down entry 1",
    }) as HTMLButtonElement;
    const up = screen.getByRole("button", {
      name: "Move up entry 1",
    }) as HTMLButtonElement;

    outer.scrollTop = 400;
    inner.scrollTop = 240;
    down.focus();

    // Simulate the reordered card: its Down is now at the list boundary and
    // disabled, while its Up has become enabled.
    onMoveDown.mockImplementationOnce(() => {
      down.disabled = true;
      up.disabled = false;
      outer.scrollTop = 0;
      inner.scrollTop = 0;
    });

    fireEvent.click(down);

    expect(onMoveDown).toHaveBeenCalledTimes(1);
    expect(outer.scrollTop).toBe(400);
    expect(inner.scrollTop).toBe(240);
    expect(document.activeElement).toBe(up);

    outer.remove();
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
    expect(year).toHaveClass("bg-surface", "min-h-11", "min-w-0");
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
