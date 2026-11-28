import { afterEach, describe, expect, it, vi } from "vitest";

import { analyticsEnabled, parseAnalyticsFlag } from "./analyticsEnabled";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseAnalyticsFlag", () => {
  it("only accepts the two truthy spellings", () => {
    for (const value of ["1", "true", "TRUE", " true ", "True"]) {
      expect(parseAnalyticsFlag(value)).toBe(true);
    }
  });

  it("treats missing, blank, and other values as off", () => {
    for (const value of [undefined, null, "", " ", "0", "false", "yes", "on"]) {
      expect(parseAnalyticsFlag(value)).toBe(false);
    }
  });
});

describe("analyticsEnabled", () => {
  it("is off unless the public build flag is truthy", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "");
    expect(analyticsEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "false");
    expect(analyticsEnabled()).toBe(false);

    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "1");
    expect(analyticsEnabled()).toBe(true);
  });
});
