export type InAppBrowserInfo = {
  inApp: boolean;
  platform: "ios" | "android" | "other";
  app?: string;
};

type AppPattern = {
  app: string;
  pattern: RegExp;
};

const APP_PATTERNS: readonly AppPattern[] = [
  { app: "Facebook", pattern: /FBAN|FBAV|FB_IAB/i },
  { app: "Instagram", pattern: /Instagram/i },
  { app: "LinkedIn", pattern: /LinkedInApp/i },
  { app: "TikTok", pattern: /musical_ly|BytedanceWebview/i },
  { app: "Twitter", pattern: /Twitter/i },
  { app: "Pinterest", pattern: /Pinterest/i },
  { app: "Line", pattern: /Line\//i },
  { app: "Slack", pattern: /Slack/i },
];

const IOS_PATTERN = /iPhone|iPad|iPod/i;
const ANDROID_PATTERN = /Android/i;
const ANDROID_WEBVIEW_PATTERN = /; wv\)/i;
const VERSIONED_CHROME_PATTERN = /Version\/\d+.*Chrome/i;

function detectPlatform(ua: string): InAppBrowserInfo["platform"] {
  if (IOS_PATTERN.test(ua)) {
    return "ios";
  }

  if (ANDROID_PATTERN.test(ua)) {
    return "android";
  }

  return "other";
}

export function detectInAppBrowser(ua: string): InAppBrowserInfo {
  const platform = detectPlatform(ua);

  for (const { app, pattern } of APP_PATTERNS) {
    if (pattern.test(ua)) {
      return { inApp: true, platform, app };
    }
  }

  if (
    ANDROID_WEBVIEW_PATTERN.test(ua) ||
    VERSIONED_CHROME_PATTERN.test(ua)
  ) {
    return { inApp: true, platform, app: "Android WebView" };
  }

  return { inApp: false, platform };
}
