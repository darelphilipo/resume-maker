import {
  analyticsMetaToken,
  validateAnalyticsEvent,
} from "../../src/lib/analytics/eventAllowlist";
import { coarseUserAgent } from "../../src/lib/analytics/userAgent";

/**
 * Cloudflare Pages Function for anonymous product click counts. The Next.js
 * build stays a static export: this file lives beside `out/` and is deployed by
 * Cloudflare Pages, never bundled into the app.
 *
 * IP address and cookies are deliberately never read. The only written fields
 * are the allowlisted event/meta, the coarse device class, and coarse os/browser
 * enums derived from the User-Agent — the raw User-Agent is never stored.
 */

export type AnalyticsBinding = {
  writeDataPoint(data: {
    blobs: (string | number | null)[];
    indexes: string[];
  }): void;
};

export type AnalyticsEnv = { ANALYTICS?: AnalyticsBinding };

export type AnalyticsContext = { request: Request; env: AnalyticsEnv };

function badRequest(): Response {
  return new Response(null, { status: 400 });
}

export async function onRequestPost({
  request,
  env,
}: AnalyticsContext): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest();
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return badRequest();
  }

  const payload = body as { event?: unknown; meta?: unknown; device?: unknown };
  const validation = validateAnalyticsEvent(payload.event, payload.meta);

  if (
    !validation.ok ||
    (payload.device !== "mobile" && payload.device !== "desktop")
  ) {
    return badRequest();
  }

  // Return 204 when the binding is not configured yet: local/dev/preview
  // deployments stay quiet instead of throwing on every beacon.
  if (!env.ANALYTICS) {
    return new Response(null, { status: 204 });
  }

  const { os, browser } = coarseUserAgent(request.headers.get("user-agent"));

  env.ANALYTICS.writeDataPoint({
    blobs: [
      validation.event,
      analyticsMetaToken(validation.meta),
      payload.device,
      os,
      browser,
    ],
    indexes: [validation.event],
  });

  return new Response(null, { status: 204 });
}
