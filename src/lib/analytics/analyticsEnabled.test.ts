import { describe, expect, it } from "vitest";

import { analyticsEnabled, parseAnalyticsFlag } from "./analyticsEnabled";

describe("parseAnalyticsFlag", () => {
  it("accepts only explicit on values", () => {
    for (const value of ["1", "true", "TRUE", " yes ", "On"]) {
      expect(parseAnalyticsFlag(value)).toBe(true);
    }
  });

  it("stays off for unset, empty, and off values", () => {
    for (const value of [undefined, "", "0", "false", "off", "no", "enabled"]) {
      expect(parseAnalyticsFlag(value)).toBe(false);
    }
  });
});

describe("analyticsEnabled", () => {
  it("reads the build-time flag and defaults to off", () => {
    const previous = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;

    try {
      delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
      expect(analyticsEnabled()).toBe(false);

      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "1";
      expect(analyticsEnabled()).toBe(true);

      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "0";
      expect(analyticsEnabled()).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
      } else {
        process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = previous;
      }
    }
  });
});
