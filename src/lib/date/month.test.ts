import { describe, expect, it } from "vitest";

import {
  formatMonth,
  isResumeYearInRange,
  MAX_RESUME_YEAR,
  MIN_RESUME_YEAR,
  parseMonthInput,
  toMonthValue,
} from "./month";

describe("isResumeYearInRange", () => {
  it("exposes the documented boundary years", () => {
    expect(MIN_RESUME_YEAR).toBe(1950);
    expect(MAX_RESUME_YEAR).toBe(2100);
  });

  it.each([
    ["1950", true],
    ["2000", true],
    ["2023", true],
    ["2100", true],
    [" 2023 ", true],
    ["1949", false],
    ["2101", false],
    ["0000", false],
    ["9999", false],
    ["99999", false],
    ["195", false],
    ["20a3", false],
    ["abcd", false],
    ["", false],
  ])("accepts %j as %j", (input, expected) => {
    expect(isResumeYearInRange(input)).toBe(expected);
  });
});

describe("toMonthValue", () => {
  it.each([
    ["2023-11", "2023-11"],
    ["2023-1", "2023-01"],
    ["2023-11-15", "2023-11"],
    [" 2023-11 ", "2023-11"],
    ["2023-13", ""],
    ["2023", ""],
    ["", ""],
    ["November 2023", ""],
  ])("normalizes %j to %j", (input, expected) => {
    expect(toMonthValue(input)).toBe(expected);
  });
});

describe("formatMonth", () => {
  it.each([
    ["2021-03", "Mar 2021"],
    ["2023-10", "Oct 2023"],
    ["2023-10-15", "Oct 2023"],
    ["2021", "2021"],
    ["", ""],
    ["garbage", "garbage"],
    ["2021-13", "2021-13"],
  ])("formats %j as %j", (input, expected) => {
    expect(formatMonth(input)).toBe(expected);
  });
});

describe("parseMonthInput", () => {
  it.each([
    ["2023-10", "2023-10"],
    ["2023-1", "2023-01"],
    ["2023-10-15", "2023-10"],
    ["10/2023", "2023-10"],
    ["1-2023", "2023-01"],
    ["Oct 2023", "2023-10"],
    ["October 2023", "2023-10"],
    ["sept 2023", "2023-09"],
    ["Oct. 2023", "2023-10"],
    ["2023", "2023"],
    ["", ""],
  ])("parses %j as %j", (input, expected) => {
    expect(parseMonthInput(input)).toBe(expected);
  });

  it.each(["Spring 2023", "13/2023", "Junk 2023"])(
    "returns null for %j",
    (input) => {
      expect(parseMonthInput(input)).toBeNull();
    },
  );
});
