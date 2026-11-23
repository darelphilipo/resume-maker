import { describe, expect, it } from "vitest";

import { textInsertion } from "./actionVerbs";

describe("textInsertion", () => {
  it("prepends a single space only after non-whitespace text", () => {
    expect(textInsertion("Built [feature]", ".")).toBe(" Built [feature]");
    expect(textInsertion("Built [feature]", " ")).toBe("Built [feature]");
    expect(textInsertion("Built [feature]", "")).toBe("Built [feature]");
  });

  it("does not double spaces after newlines", () => {
    expect(textInsertion("Built [feature]", "\n")).toBe("Built [feature]");
  });
});
