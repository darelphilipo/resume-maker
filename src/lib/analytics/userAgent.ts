/**
 * Coarse, non-identifying device hints for the aggregate analytics endpoint.
 *
 * The raw User-Agent string is read once inside the Pages Function and is
 * never stored, logged, or returned. Only these small enums reach Analytics
 * Engine.
 */

export const COARSE_OS_VALUES = [
  "android",
  "ios",
  "windows",
  "macos",
  "linux",
  "other",
] as const;

export type CoarseOs = (typeof COARSE_OS_VALUES)[number];

export const COARSE_BROWSER_VALUES = [
  "chrome",
  "safari",
  "edge",
  "firefox",
  "other",
] as const;

export type CoarseBrowser = (typeof COARSE_BROWSER_VALUES)[number];

/**
 * Order matters: Android UAs contain `Linux`, iPhone/iPad UAs contain
 * `like Mac OS X`, and Chrome/Safari share tokens. Check the narrower signal
 * first so a phone never reports as a desktop.
 */
export function coarseOsFromUserAgent(
  userAgent: string | null | undefined,
): CoarseOs {
  const ua = (userAgent ?? "").toLowerCase();

  if (ua === "") {
    return "other";
  }

  if (ua.includes("android")) {
    return "android";
  }

  if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod")
  ) {
    return "ios";
  }

  if (ua.includes("windows")) {
    return "windows";
  }

  if (ua.includes("mac os x") || ua.includes("macintosh")) {
    return "macos";
  }

  if (ua.includes("linux") || ua.includes("x11")) {
    return "linux";
  }

  return "other";
}

/**
 * Edge first (its UA also says Chrome and Safari), then Firefox, then Chrome
 * (its UA also says Safari), then Safari. iOS variants (CriOS, EdgiOS, FxiOS)
 * map to the same families.
 */
export function coarseBrowserFromUserAgent(
  userAgent: string | null | undefined,
): CoarseBrowser {
  const ua = (userAgent ?? "").toLowerCase();

  if (ua === "") {
    return "other";
  }

  if (
    ua.includes("edg/") ||
    ua.includes("edga/") ||
    ua.includes("edgios/")
  ) {
    return "edge";
  }

  if (ua.includes("firefox/") || ua.includes("fxios/")) {
    return "firefox";
  }

  if (
    (ua.includes("chrome/") || ua.includes("crios/")) &&
    !ua.includes("opr/")
  ) {
    return "chrome";
  }

  if (ua.includes("safari/")) {
    return "safari";
  }

  return "other";
}
