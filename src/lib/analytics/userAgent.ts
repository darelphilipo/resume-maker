/**
 * Map a raw User-Agent to two coarse, non-identifying enums. The original
 * string is deliberately never returned, logged, or written to a data point.
 */

export type AnalyticsOs = "android" | "ios" | "windows" | "macos" | "linux" | "other";
export type AnalyticsBrowser =
  | "chrome"
  | "safari"
  | "edge"
  | "firefox"
  | "other";

export type CoarseUserAgent = { os: AnalyticsOs; browser: AnalyticsBrowser };

export function coarseUserAgent(userAgent: string | null): CoarseUserAgent {
  const ua = userAgent ?? "";

  let os: AnalyticsOs = "other";

  if (/iPhone|iPad|iPod|CPU (iPhone )?OS/i.test(ua)) {
    os = "ios";
  } else if (/Android/i.test(ua)) {
    os = "android";
  } else if (/Windows/i.test(ua)) {
    os = "windows";
  } else if (/Mac(intosh| OS X)/i.test(ua)) {
    os = "macos";
  } else if (/Linux|X11/i.test(ua)) {
    os = "linux";
  }

  let browser: AnalyticsBrowser = "other";

  if (/Edg\/|EdgA\/|EdgiOS\//i.test(ua)) {
    browser = "edge";
  } else if (/Firefox\/|FxiOS\//i.test(ua)) {
    browser = "firefox";
  } else if (/Chrome\/|CriOS\//i.test(ua)) {
    browser = "chrome";
  } else if (/Safari\//i.test(ua)) {
    browser = "safari";
  }

  return { os, browser };
}
