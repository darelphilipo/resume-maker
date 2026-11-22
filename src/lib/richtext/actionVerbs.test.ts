import { describe, expect, it } from "vitest";

import { actionVerbInsertion, textInsertion } from "./actionVerbs";

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

describe("textInsertion", () => {
  it("prepends a single space only after non-whitespace text", () => {
    expect(textInsertion("Built [feature]", ".")).toBe(" Built [feature]");
    expect(textInsertion("Built [feature]", " ")).toBe("Built [feature]");
    expect(textInsertion("Built [feature]", "")).toBe("Built [feature]");
  });
});
