import {
  isAllowedMetaValue,
  isAnalyticsEvent,
  type AnalyticsDevice,
  type AnalyticsEvent,
  type AnalyticsMeta,
} from "./events";

/** Cloudflare Pages Functions route that receives the beacons. */
export const ANALYTICS_ENDPOINT = "/api/event";

/** Matches the editor's mobile/desktop split; the pointer check wins. */
export const MOBILE_BREAKPOINT_PX = 1024;

export type TrackEnvironment = {
  doNotTrack: string | null;
  globalDoNotTrack: string | null;
  onLine: boolean;
  hostname: string;
  device: AnalyticsDevice;
  send(body: string): void;
};

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

/**
 * Opt-outs are deliberate and checked before anything is built:
 * Do Not Track, an offline browser, and any local development host.
 */
export function shouldTrack(
  environment: Pick<
    TrackEnvironment,
    "doNotTrack" | "globalDoNotTrack" | "onLine" | "hostname"
  >,
): boolean {
  if (
    environment.doNotTrack === "1" ||
    environment.globalDoNotTrack === "1"
  ) {
    return false;
  }

  if (!environment.onLine) {
    return false;
  }

  return !isLocalHostname(environment.hostname);
}

export function resolveDevice(
  isCoarsePointer: boolean,
  viewportWidth: number,
): AnalyticsDevice {
  return isCoarsePointer || viewportWidth < MOBILE_BREAKPOINT_PX
    ? "mobile"
    : "desktop";
}

/**
 * `sendBeacon` survives the navigation that follows most onboarding clicks.
 * When it refuses the payload (queue full, unsupported), a `keepalive` fetch
 * is the same fire-and-forget shape. Both failures are swallowed.
 */
function sendWithBeacon(body: string): void {
  const payload = new Blob([body], { type: "application/json" });

  if (
    typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon(ANALYTICS_ENDPOINT, payload)
  ) {
    return;
  }

  void fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics is best-effort; a blocked or 404 endpoint is not an error.
  });
}

export function browserEnvironment(): TrackEnvironment | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  const nav = navigator as Navigator & {
    doNotTrack?: string | null;
    msDoNotTrack?: string;
  };
  const win = window as Window & { doNotTrack?: string | null };
  const coarse =
    window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

  return {
    doNotTrack: nav.doNotTrack ?? nav.msDoNotTrack ?? null,
    globalDoNotTrack: win.doNotTrack ?? null,
    onLine: nav.onLine !== false,
    hostname: window.location.hostname,
    device: resolveDevice(coarse, window.innerWidth),
    send: sendWithBeacon,
  };
}

/**
 * Fire-and-forget anonymous click counting.
 *
 * Never throws, never blocks the UI, and never sends anything except the
 * closed `{ event, meta, device }` payload. Resume content cannot reach it:
 * `meta` is validated against the fixed per-event allowlist first.
 */
export function trackEvent(
  event: AnalyticsEvent,
  meta?: AnalyticsMeta,
  environment: TrackEnvironment | null = browserEnvironment(),
): void {
  try {
    if (!environment || !shouldTrack(environment) || !isAnalyticsEvent(event)) {
      return;
    }

    const payloadMeta = meta ?? null;

    if (payloadMeta !== null && !isAllowedMetaValue(event, payloadMeta)) {
      return;
    }

    environment.send(
      JSON.stringify({ event, meta: payloadMeta, device: environment.device }),
    );
  } catch {
    // A privacy tool, a blocked beacon, or a serialization failure must never
    // interrupt an export, an import, or a print.
  }
}
