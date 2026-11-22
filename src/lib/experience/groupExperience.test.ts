import { describe, expect, it } from "vitest";

import {
  experienceDateSpan,
  groupExperienceItems,
  normalizeCompanyName,
} from "./groupExperience";

describe("normalizeCompanyName", () => {
  it("ignores case and extra whitespace but keeps punctuation", () => {
    expect(normalizeCompanyName("  Acme   Corp. ")).toBe("acme corp.");
    expect(normalizeCompanyName("ACME CORP.")).toBe("acme corp.");
  });

  it("returns an empty key for a blank company", () => {
    expect(normalizeCompanyName("   ")).toBe("");
  });
});

describe("experienceDateSpan", () => {
  it("uses the earliest start and latest end across the group", () => {
    expect(
      experienceDateSpan([
        { startDate: "2022-01", endDate: "2023-06" },
        { startDate: "2020-03", endDate: "2021-12" },
      ]),
    ).toEqual({ start: "2020-03", end: "2023-06", current: false });
  });

  it("keeps the span open when any role is current", () => {
    expect(
      experienceDateSpan([
        { startDate: "2020-03", endDate: "2021-12" },
        { startDate: "2022-01", current: true },
      ]),
    ).toEqual({ start: "2020-03", end: "", current: true });
  });

  it("ignores blank dates", () => {
    expect(
      experienceDateSpan([
        { startDate: "", endDate: "" },
        { startDate: "2024-05", endDate: "" },
      ]),
    ).toEqual({ start: "2024-05", end: "", current: false });
  });
});

describe("groupExperienceItems", () => {
  it("groups consecutive roles with the same normalized company", () => {
    const items = [
      { id: "e1", company: "Acme", position: "Engineer" },
      { id: "e2", company: " acme ", position: "Senior Engineer" },
    ];

    const groups = groupExperienceItems(items);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      company: "Acme",
      grouped: true,
      entryIds: ["e1", "e2"],
    });
    expect(groups[0].items).toHaveLength(2);
  });

  it("starts a new group when a company reappears later", () => {
    const groups = groupExperienceItems([
      { id: "e1", company: "Acme" },
      { id: "e2", company: "Globex" },
      { id: "e3", company: "Acme" },
    ]);

    expect(groups.map((group) => group.entryIds)).toEqual([
      ["e1"],
      ["e2"],
      ["e3"],
    ]);
    expect(groups.every((group) => group.grouped === false)).toBe(true);
  });

  it("never joins blank companies", () => {
    const groups = groupExperienceItems([
      { id: "e1", company: "" },
      { id: "e2", company: "  " },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.grouped === false)).toBe(true);
  });

  it("combines dates and unique locations for the group header", () => {
    const groups = groupExperienceItems([
      {
        id: "e1",
        company: "Acme",
        location: "Remote",
        startDate: "2022-01",
        endDate: "2023-06",
      },
      {
        id: "e2",
        company: "Acme",
        location: " remote ",
        startDate: "2020-03",
        endDate: "2021-12",
      },
      {
        id: "e3",
        company: "Acme",
        location: "New York, NY",
        startDate: "2023-07",
        current: true,
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].location).toBe("Remote · New York, NY");
    expect(groups[0].dateSpan).toEqual({
      start: "2020-03",
      end: "",
      current: true,
    });
  });

  it("keeps a single role ungrouped and does not mutate the input", () => {
    const items = [{ id: "e1", company: "Acme", position: "Engineer" }];

    const groups = groupExperienceItems(items);

    expect(groups).toHaveLength(1);
    expect(groups[0].grouped).toBe(false);
    expect(items).toEqual([{ id: "e1", company: "Acme", position: "Engineer" }]);
  });

  it("falls back to a generated id when an entry has none", () => {
    const groups = groupExperienceItems([
      { company: "Acme" },
      { company: "Acme" },
    ]);

    expect(groups[0].entryIds).toEqual(["item-0", "item-1"]);
  });
});
