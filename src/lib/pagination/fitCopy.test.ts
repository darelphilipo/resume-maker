import { describe, expect, it } from "vitest";

import { MIN_FIT_SCALE } from "./fitScale";
import { FIT_BLOCKED_COPY, MIN_FIT_LABEL, fitBlockedCopy } from "./fitCopy";

describe("fit copy", () => {
  it("uses the readable floor in the compact label", () => {
    expect(MIN_FIT_LABEL).toBe(`Min ${Math.round(MIN_FIT_SCALE * 100)}%`);
  });

  it("explains both blocked reasons without a suggestion below the floor", () => {
    expect(fitBlockedCopy("page-break")).toContain("start on a new page");
    expect(fitBlockedCopy("too-tall")).toContain(`above ${Math.round(
      MIN_FIT_SCALE * 100,
    )}%`);
    expect(FIT_BLOCKED_COPY["too-tall"]).toContain("trim a line or two");
  });
});
