/**
 * Anonymous click counts need the `/api/event` Pages Function, and that only
 * exists where the site is hosted with an `ANALYTICS` binding (Cloudflare
 * Pages). The GitHub Pages deployment ships the static export alone, so
 * `/api/event` is a 404 there: beacons would fail on every click and the home
 * page would promise counts that never land.
 *
 * Analytics is therefore opt-in per build. Set
 * `NEXT_PUBLIC_ANALYTICS_ENABLED=1` (or `true`/`yes`/`on`) in the build that
 * also deploys the Pages Function; unset, `0`, and `false` stay completely
 * silent. Next.js inlines `NEXT_PUBLIC_*` at build time, so the flag cannot be
 * flipped from the browser.
 */
export function parseAnalyticsFlag(value: string | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

/** True only when the current build opted into the anonymous counter. */
export function analyticsEnabled(
  flag: string | undefined = readAnalyticsFlag(),
): boolean {
  return parseAnalyticsFlag(flag);
}

/**
 * Next.js inlines `NEXT_PUBLIC_*` at build time. The `process` guard keeps a
 * non-inlined bundle (or a plain browser test) from throwing: an unreadable
 * flag is simply off.
 */
function readAnalyticsFlag(): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }

  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
}
