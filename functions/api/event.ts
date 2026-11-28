import {
  parseAnalyticsPayload,
  type AnalyticsPayload,
} from "../../src/lib/analytics/events";
import {
  coarseBrowserFromUserAgent,
  coarseOsFromUserAgent,
} from "../../src/lib/analytics/userAgent";

/**
 * Cloudflare Pages Function: `POST /api/event`.
 *
 * This is intentionally the only server-side code in the project and it is
 * not part of the Next.js static export. It accepts the closed analytics
 * payload, maps the request User-Agent to two coarse enums, and writes one
 * Analytics Engine data point. It never reads IP addresses or cookies, and it
 * never returns user data.
 *
 * A missing `ANALYTICS` binding (local preview, GitHub Pages, a fresh Pages
 * project) is not an error: the beacon still gets its quiet `204`.
 */

type AnalyticsEngineDataPoint = {
  blobs?: (string | null)[];
  doubles?: number[];
  indexes?: string[];
};

type AnalyticsEngineDataset = {
  writeDataPoint(point: AnalyticsEngineDataPoint): void;
};

export type AnalyticsEnv = {
  ANALYTICS?: AnalyticsEngineDataset;
};

/**
 * Structural request shape so the handler is testable without a DOM `Request`
 * implementation. Cloudflare supplies a real `Request` at runtime.
 */
export type AnalyticsRequest = {
  headers: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
};

export type AnalyticsContext = {
  request: AnalyticsRequest;
  env: AnalyticsEnv;
};

/** Generous for the three-key payload, small enough to reject junk. */
export const MAX_ANALYTICS_BODY_BYTES = 1024;

function emptyResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

async function readPayload(
  request: AnalyticsRequest,
): Promise<AnalyticsPayload | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_ANALYTICS_BODY_BYTES
  ) {
    return null;
  }

  try {
    return parseAnalyticsPayload(await request.json());
  } catch {
    return null;
  }
}

export async function onRequestPost(
  context: AnalyticsContext,
): Promise<Response> {
  const payload = await readPayload(context.request);

  if (!payload) {
    return emptyResponse(400);
  }

  try {
    // Only the coarse enums leave this function; the raw UA is discarded.
    context.env.ANALYTICS?.writeDataPoint({
      blobs: [
        payload.event,
        payload.meta ?? "",
        payload.device,
        coarseOsFromUserAgent(context.request.headers.get("user-agent")),
        coarseBrowserFromUserAgent(context.request.headers.get("user-agent")),
      ],
      indexes: [payload.event],
    });
  } catch {
    // A misconfigured binding must never turn a click into a failed request.
  }

  return emptyResponse(204);
}
