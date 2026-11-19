import { describe, expect, it } from "vitest";

import { resumeDisplayName, UNTITLED_RESUME_NAME } from "./resumeName";

describe("resumeDisplayName", () => {
  it("returns a trimmed name unchanged", () => {
    expect(resumeDisplayName("Ada Lovelace")).toBe("Ada Lovelace");
  });

  it("trims surrounding whitespace from a typed name", () => {
    expect(resumeDisplayName("  Ada Lovelace  ")).toBe("Ada Lovelace");
  });

  it("falls back to Untitled resume for an empty or whitespace-only name", () => {
    expect(resumeDisplayName("")).toBe(UNTITLED_RESUME_NAME);
    expect(resumeDisplayName("   \n\t ")).toBe(UNTITLED_RESUME_NAME);
  });
});
