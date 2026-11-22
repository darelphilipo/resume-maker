import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import type { ResumeRow } from "./db";
import {
  clampRecentPage,
  recentPageCount,
  recentPageRows,
  recentResumeEditedLabel,
  recentResumeName,
  RECENT_PAGE_SIZE,
  UNTITLED_RESUME,
} from "./recentResumes";

function row(patch: { name?: string; headline?: string }): ResumeRow {
  const doc = createEmptyResume();

  doc.basics.name = patch.name ?? "";
  doc.basics.headline = patch.headline ?? "";

  return { id: "row-1", updatedAt: Date.UTC(2026, 10, 18), doc };
}

describe("recentResumeName", () => {
  it("uses the candidate name when it is set", () => {
    expect(recentResumeName(row({ name: "Grace Hopper" }))).toBe(
      "Grace Hopper",
    );
  });

  it("falls back to the headline, then to Untitled resume", () => {
    expect(recentResumeName(row({ headline: "Backend Engineer" }))).toBe(
      "Backend Engineer",
    );
    expect(recentResumeName(row({}))).toBe(UNTITLED_RESUME);
  });

  it("ignores whitespace-only names", () => {
    expect(recentResumeName(row({ name: "   ", headline: "Designer" }))).toBe(
      "Designer",
    );
  });
});

describe("recentResumeEditedLabel", () => {
  it("formats a saved timestamp in plain language", () => {
    expect(recentResumeEditedLabel(Date.UTC(2026, 10, 18))).toBe(
      "Edited Nov 18, 2026",
    );
  });

  it("survives a missing timestamp", () => {
    expect(recentResumeEditedLabel(0)).toBe("Edited recently");
    expect(recentResumeEditedLabel(Number.NaN)).toBe("Edited recently");
  });
});

describe("recent resume pagination", () => {
  const rows = Array.from({ length: 12 }, (_, index) => `row-${index}`);

  it("uses five rows per page and always has at least one page", () => {
    expect(RECENT_PAGE_SIZE).toBe(5);
    expect(recentPageCount(0)).toBe(1);
    expect(recentPageCount(5)).toBe(1);
    expect(recentPageCount(6)).toBe(2);
    expect(recentPageCount(12)).toBe(3);
  });

  it("clamps a page into the available range", () => {
    expect(clampRecentPage(0, 12)).toBe(1);
    expect(clampRecentPage(2, 12)).toBe(2);
    expect(clampRecentPage(9, 12)).toBe(3);
    expect(clampRecentPage(Number.NaN, 0)).toBe(1);
  });

  it("slices the requested page", () => {
    expect(recentPageRows(rows, 1)).toEqual(rows.slice(0, 5));
    expect(recentPageRows(rows, 2)).toEqual(rows.slice(5, 10));
    expect(recentPageRows(rows, 3)).toEqual(rows.slice(10, 12));
    expect(recentPageRows(rows, 99)).toEqual(rows.slice(10, 12));
  });
});
