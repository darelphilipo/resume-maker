import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DateRange, formatMonth } from "./DateRange";

describe("formatMonth", () => {
  it.each([
    ["2021-03", "Mar 2021"],
    ["2021", "2021"],
    ["", ""],
    ["garbage", "garbage"],
    ["2021-13", "2021-13"],
  ])("formats %j as %j", (input, expected) => {
    expect(formatMonth(input)).toBe(expected);
  });
});

describe("DateRange", () => {
  it("renders Present for current roles", () => {
    render(<DateRange start="2020-01" end="" current />);

    expect(screen.getByText("Jan 2020 — Present")).toBeInTheDocument();
  });

  it("renders both ends of a finished role", () => {
    render(<DateRange start="2021-03" end="2023-08" current={false} />);

    expect(screen.getByText("Mar 2021 — Aug 2023")).toBeInTheDocument();
  });

  it("renders nothing when both ends are empty", () => {
    const { container } = render(
      <DateRange start="" end="" current={false} />,
    );

    expect(container.textContent).toBe("");
  });
});
