import { describe, expect, it } from "vitest";

import {
  dateRangeWarning,
  isNewestFirst,
  isPresentEntry,
  sortEntriesNewestFirst,
} from "./sortEntries";

type Entry = {
  id: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
};

function entry(id: string, overrides: Partial<Entry> = {}): Entry {
  return { id, startDate: "", endDate: "", ...overrides };
}

function ids(items: Entry[]): string[] {
  return items.map((item) => item.id);
}

describe("isPresentEntry", () => {
  it("accepts the current flag and a Present end date", () => {
    expect(isPresentEntry({ current: true })).toBe(true);
    expect(isPresentEntry({ endDate: "Present" })).toBe(true);
    expect(isPresentEntry({ endDate: " present " })).toBe(true);
    expect(isPresentEntry({ endDate: "2024-05" })).toBe(false);
  });
});

describe("sortEntriesNewestFirst", () => {
  it("puts current roles first, then newest end and start dates, undated last", () => {
    const items = [
      entry("undated"),
      entry("older", { startDate: "2018-01", endDate: "2020-06" }),
      entry("current", { startDate: "2024-01", current: true }),
      entry("newer", { startDate: "2021-02", endDate: "2023-09" }),
      entry("same-end-older-start", {
        startDate: "2020-01",
        endDate: "2021-12",
      }),
      entry("same-end-newer-start", {
        startDate: "2021-01",
        endDate: "2021-12",
      }),
    ];

    expect(ids(sortEntriesNewestFirst(items))).toEqual([
      "current",
      "newer",
      "same-end-newer-start",
      "same-end-older-start",
      "older",
      "undated",
    ]);
  });

  it("treats a literal Present end date like the current toggle", () => {
    const items = [
      entry("dated", { startDate: "2022-01", endDate: "2023-01" }),
      entry("present", { startDate: "2020-01", endDate: "Present" }),
    ];

    expect(ids(sortEntriesNewestFirst(items))).toEqual(["present", "dated"]);
  });

  it("keeps equal entries in their existing order and does not mutate input", () => {
    const items = [
      entry("first", { startDate: "2020-01", endDate: "2021-01" }),
      entry("second", { startDate: "2020-01", endDate: "2021-01" }),
      entry("third", { startDate: "2020-01", endDate: "2021-01" }),
    ];
    const original = [...items];

    const sorted = sortEntriesNewestFirst(items);

    expect(ids(sorted)).toEqual(["first", "second", "third"]);
    expect(sorted).not.toBe(items);
    expect(items).toEqual(original);
  });

  it("sorts an entry with only a start date by that month", () => {
    const items = [
      entry("start-only-old", { startDate: "2019-04" }),
      entry("with-end", { startDate: "2018-01", endDate: "2020-01" }),
      entry("start-only-new", { startDate: "2024-02" }),
    ];

    expect(ids(sortEntriesNewestFirst(items))).toEqual([
      "start-only-new",
      "with-end",
      "start-only-old",
    ]);
  });
});

describe("isNewestFirst", () => {
  it("is true for empty and single-entry lists", () => {
    expect(isNewestFirst([])).toBe(true);
    expect(isNewestFirst([entry("only")])).toBe(true);
  });

  it("detects lists that already read newest-first", () => {
    expect(
      isNewestFirst([
        entry("current", { current: true }),
        entry("new", { startDate: "2022-01", endDate: "2023-01" }),
        entry("old", { startDate: "2019-01", endDate: "2020-01" }),
        entry("undated"),
      ]),
    ).toBe(true);

    expect(
      isNewestFirst([
        entry("old", { startDate: "2019-01", endDate: "2020-01" }),
        entry("new", { startDate: "2022-01", endDate: "2023-01" }),
      ]),
    ).toBe(false);
  });
});

describe("dateRangeWarning", () => {
  it("flags an end month before the start month", () => {
    expect(dateRangeWarning("2024-06", "2024-05")).toBe(
      "End date is earlier than start date",
    );
    expect(dateRangeWarning("2024-06-15", "2024-05-01")).toBe(
      "End date is earlier than start date",
    );
  });

  it("stays quiet for valid, blank, current, or open-ended ranges", () => {
    expect(dateRangeWarning("2024-01", "2024-06")).toBeNull();
    expect(dateRangeWarning("2024-06", "2024-06")).toBeNull();
    expect(dateRangeWarning("", "2024-06")).toBeNull();
    expect(dateRangeWarning("2024-06", "")).toBeNull();
    expect(dateRangeWarning("2024-06", "2024-05", true)).toBeNull();
    expect(dateRangeWarning("2024-06", "Present")).toBeNull();
  });
});
