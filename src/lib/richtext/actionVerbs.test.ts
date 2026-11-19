import { describe, expect, it } from "vitest";

import { actionVerbInsertion } from "./actionVerbs";

describe("actionVerbInsertion", () => {
  it("prepends a space after non-whitespace text", () => {
    expect(actionVerbInsertion("Built", ".")).toBe(" Built ");
    expect(actionVerbInsertion("Reduced", "s")).toBe(" Reduced ");
  });

  it("does not double spaces after existing whitespace", () => {
    expect(actionVerbInsertion("Led", " ")).toBe("Led ");
    expect(actionVerbInsertion("Led", "\n")).toBe("Led ");
  });

  it("starts cleanly at the beginning of a line", () => {
    expect(actionVerbInsertion("Automated", "")).toBe("Automated ");
  });
});
