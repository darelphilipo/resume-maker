import { describe, expect, it } from "vitest";

import {
  DEFAULT_RESUME_STATUS,
  filterResumesByStatus,
  isResumeStatus,
  normalizeTargetCompany,
  resolveStatusFilter,
  resumeStatusCounts,
  resumeStatusOf,
  resumeTargetCompany,
} from "./resumeTracking";

describe("resumeStatusOf", () => {
  it("returns a saved status", () => {
    expect(resumeStatusOf({ status: "interview" })).toBe("interview");
  });

  it("falls back to master for legacy, blank, or unknown values", () => {
    expect(resumeStatusOf({})).toBe(DEFAULT_RESUME_STATUS);
    expect(resumeStatusOf({ status: undefined })).toBe("master");
    expect(resumeStatusOf({ status: "" })).toBe("master");
    expect(resumeStatusOf({ status: "ghosted" })).toBe("master");
  });
});

describe("isResumeStatus", () => {
  it("accepts only the five known statuses", () => {
    expect(isResumeStatus("offer")).toBe(true);
    expect(isResumeStatus("Offer")).toBe(false);
    expect(isResumeStatus(null)).toBe(false);
    expect(isResumeStatus(3)).toBe(false);
  });
});

describe("target company", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeTargetCompany("  Acme   Corp \n")).toBe("Acme Corp");
  });

  it("reads a missing or non-string value as blank", () => {
    expect(resumeTargetCompany({})).toBe("");
    expect(resumeTargetCompany({ targetCompany: undefined })).toBe("");
    expect(resumeTargetCompany({ targetCompany: null })).toBe("");
  });

  it("normalizes a saved company", () => {
    expect(resumeTargetCompany({ targetCompany: "  North   Star " })).toBe(
      "North Star",
    );
  });
});

describe("filterResumesByStatus", () => {
  const rows = [
    { id: "a", status: "applied" },
    { id: "b", status: "interview" },
    { id: "c" },
    { id: "d", status: "applied" },
  ];

  it("returns a copy of every row for all", () => {
    const all = filterResumesByStatus(rows, "all");

    expect(all.map((row) => row.id)).toEqual(["a", "b", "c", "d"]);
    expect(all).not.toBe(rows);
  });

  it("keeps legacy rows in the master bucket", () => {
    expect(filterResumesByStatus(rows, "master").map((row) => row.id)).toEqual([
      "c",
    ]);
  });

  it("filters by one status", () => {
    expect(filterResumesByStatus(rows, "applied").map((row) => row.id)).toEqual([
      "a",
      "d",
    ]);
  });
});

describe("resumeStatusCounts", () => {
  it("counts every status, including empty ones", () => {
    const counts = resumeStatusCounts([
      { status: "applied" },
      { status: "applied" },
      { status: "offer" },
      {},
    ]);

    expect(counts).toEqual({
      master: 1,
      draft: 0,
      applied: 2,
      interview: 0,
      offer: 1,
    });
  });
});

describe("resolveStatusFilter", () => {
  it("falls back to all when the chosen status has no rows", () => {
    expect(resolveStatusFilter([{ status: "draft" }], "offer")).toBe("all");
    expect(resolveStatusFilter([{ status: "offer" }], "offer")).toBe("offer");
    expect(resolveStatusFilter([], "all")).toBe("all");
  });
});
