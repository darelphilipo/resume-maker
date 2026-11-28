import {
  validateAnalyticsEvent,
  type AnalyticsEvent,
  type AnalyticsMeta,
} from "./eventAllowlist";

/** Coarse device class only — no model, screen size, or orientation. */
export function deviceClass(): "mobile" | "desktop" {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const coarse =
    window.matchMedia?.("(pointer: coarse)").matches === true ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);

  return coarse ? "mobile" : "desktop";
}

/**
 * `/api/event` is a Pages Function beside the static export, so its URL must
 * carry the deployment's base path. Derive it from the current pathname instead
 * of hardcoding an absolute path: `/` → `/api/event`, `/resume-maker/` →
 * `/resume-maker/api/event`, `/resume-maker/editor/` → the same.
 */
export function analyticsEndpoint(pathname: string): string {
  const trimmed = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  const base = trimmed.endsWith("/editor")
    ? trimmed.slice(0, -"/editor".length)
    : trimmed;

  return `${base}/api/event`;
}

/**
 * The browser facts the beacon needs. Kept as one value so the opt-out rules
 * can be tested without jsdom's read-only `location`.
 */
export type BeaconEnv = {
  hostname: string;
  pathname: string;
  doNotTrack: string | null | undefined;
  onLine: boolean;
  coarse: boolean;
  sendBeacon: ((url: string, body: BodyInit) => boolean) | undefined;
};

function browserEnv(): BeaconEnv | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  return {
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    doNotTrack: navigator.doNotTrack,
    onLine: navigator.onLine,
    coarse: deviceClass() === "mobile",
    sendBeacon: navigator.sendBeacon?.bind(navigator),
  };
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Fire-and-forget, zero-PII click counter. Never sends resume text, filenames,
 * URLs, or identifiers, and silently opts out on localhost, Do Not Track, and
 * offline/blocked beacons. A failed beacon must never affect the UI.
 */
export function trackEvent(
  event: AnalyticsEvent,
  meta?: AnalyticsMeta,
  env: BeaconEnv | null = browserEnv(),
): void {
  if (
    env === null ||
    isLocalhost(env.hostname) ||
    env.doNotTrack === "1" ||
    env.onLine === false ||
    typeof env.sendBeacon !== "function"
  ) {
    return;
  }

  const payload = validateAnalyticsEvent(event, meta);

  if (!payload.ok) {
    return;
  }

  const body = JSON.stringify({
    event: payload.event,
    meta: payload.meta,
    device: env.coarse ? "mobile" : "desktop",
  });

  try {
    void env.sendBeacon(analyticsEndpoint(env.pathname), body);
  } catch {
    // Analytics is best-effort: a blocked beacons call is not an app error.
  }
}
