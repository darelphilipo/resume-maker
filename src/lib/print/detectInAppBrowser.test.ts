import { describe, expect, it } from "vitest";

import { detectInAppBrowser } from "./detectInAppBrowser";

const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("detectInAppBrowser", () => {
  it("detects the Facebook in-app browser on iOS", () => {
    const ua = `${IOS_SAFARI
      .replace("Safari/604.1", "")
      .trim()} [FBAN/FBIOS;FBAV/431.0.0.35.116;FBBV/123456;FBDV/iPhone14,5]`;

    expect(detectInAppBrowser(ua)).toEqual({
      inApp: true,
      platform: "ios",
      app: "Facebook",
    });
  });

  it("detects Instagram", () => {
    const ua = `${IOS_SAFARI
      .replace("Safari/604.1", "")
      .trim()} Instagram 312.0.0.34.100 (iPhone14,5; iOS 17_0; en_US)`;

    expect(detectInAppBrowser(ua)).toEqual({
      inApp: true,
      platform: "ios",
      app: "Instagram",
    });
  });

  it("detects an Android WebView", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/117.0.0.0 Mobile Safari/537.36";

    expect(detectInAppBrowser(ua)).toEqual({
      inApp: true,
      platform: "android",
      app: "Android WebView",
    });
  });

  it("detects Slack", () => {
    const ua = `${ANDROID_CHROME} Slack/23.11.20`;

    expect(detectInAppBrowser(ua)).toEqual({
      inApp: true,
      platform: "android",
      app: "Slack",
    });
  });

  it("does not flag plain iOS Safari", () => {
    expect(detectInAppBrowser(IOS_SAFARI)).toEqual({
      inApp: false,
      platform: "ios",
    });
  });

  it("does not flag Android Chrome", () => {
    expect(detectInAppBrowser(ANDROID_CHROME)).toEqual({
      inApp: false,
      platform: "android",
    });
  });

  it("does not flag desktop Chrome", () => {
    expect(detectInAppBrowser(DESKTOP_CHROME)).toEqual({
      inApp: false,
      platform: "other",
    });
  });

  it("detects LinkedIn, TikTok, Twitter, Pinterest, and Line", () => {
    const cases = [
      { marker: "LinkedInApp", app: "LinkedIn" },
      { marker: "musical_ly", app: "TikTok" },
      { marker: "Twitter", app: "Twitter" },
      { marker: "Pinterest", app: "Pinterest" },
      { marker: "Line/", app: "Line" },
    ];

    for (const { marker, app } of cases) {
      expect(detectInAppBrowser(`${ANDROID_CHROME} ${marker}`)).toEqual({
        inApp: true,
        platform: "android",
        app,
      });
    }
  });
});
