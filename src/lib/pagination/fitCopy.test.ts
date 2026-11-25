import { describe, expect, it } from "vitest";

import { FIT_BLOCKED_COPY, fitBlockedCopy } from "./fitCopy";

describe("fit copy", () => {
  it("explains both blocked reasons in plain language, without a percentage floor", () => {
    expect(fitBlockedCopy("page-break")).toContain("start on a new page");
    expect(fitBlockedCopy("too-tall")).toContain("trim a few lines");
    expect(fitBlockedCopy("too-tall")).toContain("Compact density");
    expect(FIT_BLOCKED_COPY["too-tall"]).not.toMatch(/\d+%/);
  });
});
