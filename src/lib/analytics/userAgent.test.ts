import {
  COARSE_BROWSER_VALUES,
  COARSE_OS_VALUES,
  coarseBrowserFromUserAgent,
  coarseOsFromUserAgent,
} from "./userAgent";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36";
const WINDOWS_EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const LINUX_FIREFOX =
  "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0";
const IOS_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1";
const IOS_FIREFOX =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/605.1.15";
const IOS_EDGE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/123.0.0.0 Mobile/15E148 Safari/605.1.15";

describe("coarseOsFromUserAgent", () => {
  it.each([
    [IPHONE_SAFARI, "ios"],
    [IPAD_SAFARI, "ios"],
    [ANDROID_CHROME, "android"],
    [WINDOWS_EDGE, "windows"],
    [MAC_CHROME, "macos"],
    [LINUX_FIREFOX, "linux"],
  ] as const)("maps %s to %s", (userAgent, expected) => {
    expect(coarseOsFromUserAgent(userAgent)).toBe(expected);
  });

  it("falls back to other for an empty or unknown agent", () => {
    expect(coarseOsFromUserAgent("")).toBe("other");
    expect(coarseOsFromUserAgent(null)).toBe("other");
    expect(coarseOsFromUserAgent(undefined)).toBe("other");
    expect(coarseOsFromUserAgent("curl/8.0")).toBe("other");
  });

  it("only ever returns the documented enum", () => {
    for (const userAgent of [
      IPHONE_SAFARI,
      ANDROID_CHROME,
      WINDOWS_EDGE,
      MAC_CHROME,
      LINUX_FIREFOX,
      "",
    ]) {
      expect(COARSE_OS_VALUES).toContain(coarseOsFromUserAgent(userAgent));
    }
  });
});

describe("coarseBrowserFromUserAgent", () => {
  it.each([
    [IPHONE_SAFARI, "safari"],
    [IPAD_SAFARI, "safari"],
    [ANDROID_CHROME, "chrome"],
    [WINDOWS_EDGE, "edge"],
    [MAC_CHROME, "chrome"],
    [LINUX_FIREFOX, "firefox"],
    [IOS_CHROME, "chrome"],
    [IOS_FIREFOX, "firefox"],
    [IOS_EDGE, "edge"],
  ] as const)("maps %s to %s", (userAgent, expected) => {
    expect(coarseBrowserFromUserAgent(userAgent)).toBe(expected);
  });

  it("falls back to other for an empty or unknown agent", () => {
    expect(coarseBrowserFromUserAgent("")).toBe("other");
    expect(coarseBrowserFromUserAgent(null)).toBe("other");
    expect(coarseBrowserFromUserAgent("curl/8.0")).toBe("other");
  });

  it("only ever returns the documented enum", () => {
    for (const userAgent of [
      IPHONE_SAFARI,
      ANDROID_CHROME,
      WINDOWS_EDGE,
      MAC_CHROME,
      LINUX_FIREFOX,
      "",
    ]) {
      expect(COARSE_BROWSER_VALUES).toContain(
        coarseBrowserFromUserAgent(userAgent),
      );
    }
  });
});
