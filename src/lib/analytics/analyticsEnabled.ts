/**
 * Anonymous click analytics are opt-in per build.
 *
 * GitHub Pages has no Functions runtime, so the deployed static export must not
 * fire `/api/event` beacons that can only 404. Only a build that explicitly sets
 * `NEXT_PUBLIC_ANALYTICS_ENABLED=1` (or `true`) talks to the endpoint.
 */
export function parseAnalyticsFlag(value: string | null | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return normalized === "1" || normalized === "true";
}

export function analyticsEnabled(): boolean {
  return parseAnalyticsFlag(process.env.NEXT_PUBLIC_ANALYTICS_ENABLED);
}
