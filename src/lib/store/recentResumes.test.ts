import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import type { ResumeRow } from "./db";
import {
  recentResumeEditedLabel,
  recentResumeName,
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
