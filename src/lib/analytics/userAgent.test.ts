import { describe, expect, it } from "vitest";

import { coarseUserAgent } from "./userAgent";

describe("coarseUserAgent", () => {
  it("maps phones and desktops to coarse enums only", () => {
    expect(
      coarseUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toEqual({ os: "ios", browser: "safari" });
    expect(
      coarseUserAgent(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
    ).toEqual({ os: "android", browser: "chrome" });
    expect(
      coarseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      ),
    ).toEqual({ os: "windows", browser: "edge" });
    expect(
      coarseUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
      ),
    ).toEqual({ os: "macos", browser: "firefox" });
    expect(
      coarseUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toEqual({ os: "linux", browser: "chrome" });
  });

  it("never returns the raw User-Agent and defaults unknown clients", () => {
    const result = coarseUserAgent("SomeCustomAgent/9.1");
    expect(result).toEqual({ os: "other", browser: "other" });
    expect(coarseUserAgent(null)).toEqual({ os: "other", browser: "other" });
    expect(JSON.stringify(result)).not.toContain("SomeCustomAgent");
  });
});
