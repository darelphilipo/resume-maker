import { describe, expect, it } from "vitest";

import { slugFileName } from "./ExportJsonButton";

describe("slugFileName", () => {
  it("lowercases and hyphenates a name", () => {
    expect(slugFileName("Ada Lovelace")).toBe("ada-lovelace");
  });

  it("falls back to resume for empty input", () => {
    expect(slugFileName("  ")).toBe("resume");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugFileName("O'Brien / Smith")).toBe("o-brien-smith");
  });
});
