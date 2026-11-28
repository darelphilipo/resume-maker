import {
  MAX_ANALYTICS_BODY_BYTES,
  onRequestPost,
  type AnalyticsContext,
} from "../../../functions/api/event";

type WriteCall = {
  blobs?: (string | null)[];
  indexes?: string[];
};

function request(
  body: unknown,
  headers: Record<string, string> = {},
): AnalyticsContext["request"] {
  const values = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    headers: {
      get(name: string) {
        return values.get(name.toLowerCase()) ?? null;
      },
    },
    json: async () => body,
  };
}

function context(
  body: unknown,
  headers: Record<string, string> = {},
): AnalyticsContext & { writes: WriteCall[] } {
  const writes: WriteCall[] = [];

  return {
    request: request(body, headers),
    env: {
      ANALYTICS: {
        writeDataPoint(point: WriteCall) {
          writes.push(point);
        },
      },
    },
    writes,
  };
}

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

describe("POST /api/event", () => {
  it("writes one aggregate point with coarse device enums", async () => {
    const ctx = context(
      { event: "pdf_export", meta: "a4", device: "mobile" },
      { "user-agent": IPHONE_SAFARI, cookie: "session=secret" },
    );

    const response = await onRequestPost(ctx);

    expect(response.status).toBe(204);
    expect(ctx.writes).toEqual([
      {
        blobs: ["pdf_export", "a4", "mobile", "ios", "safari"],
        indexes: ["pdf_export"],
      },
    ]);
  });

  it("stores an empty string when the event carries no meta", async () => {
    const ctx = context({
      event: "editor_first_edit",
      meta: null,
      device: "desktop",
    });

    const response = await onRequestPost(ctx);

    expect(response.status).toBe(204);
    expect(ctx.writes[0].blobs).toEqual([
      "editor_first_edit",
      "",
      "desktop",
      "other",
      "other",
    ]);
  });

  it("rejects an unknown event, unknown meta, or extra keys with 400", async () => {
    for (const body of [
      { event: "exfiltrate_resume", meta: null, device: "mobile" },
      { event: "pdf_export", meta: "Ada Lovelace", device: "mobile" },
      {
        event: "pdf_export",
        meta: "a4",
        device: "mobile",
        name: "Ada Lovelace",
      },
      { event: "pdf_export", device: "mobile" },
    ]) {
      const ctx = context(body);

      const response = await onRequestPost(ctx);

      expect(response.status).toBe(400);
      expect(ctx.writes).toHaveLength(0);
    }
  });

  it("rejects malformed JSON and oversized bodies", async () => {
    const malformed: AnalyticsContext = {
      request: {
        headers: { get: () => null },
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      },
      env: {},
    };

    expect((await onRequestPost(malformed)).status).toBe(400);

    let read = false;
    const oversized: AnalyticsContext = {
      request: {
        headers: {
          get: (name) =>
            name.toLowerCase() === "content-length"
              ? String(MAX_ANALYTICS_BODY_BYTES + 1)
              : null,
        },
        json: async () => {
          read = true;
          return { event: "pdf_export", meta: "a4", device: "mobile" };
        },
      },
      env: {},
    };

    expect((await onRequestPost(oversized)).status).toBe(400);
    expect(read).toBe(false);
  });

  it("still returns 204 when the ANALYTICS binding is missing or broken", async () => {
    const missing = await onRequestPost({
      request: request({ event: "ats_copy", meta: "all", device: "mobile" }),
      env: {},
    });

    expect(missing.status).toBe(204);

    const broken = await onRequestPost({
      request: request({ event: "ats_copy", meta: "all", device: "mobile" }),
      env: {
        ANALYTICS: {
          writeDataPoint() {
            throw new Error("binding misconfigured");
          },
        },
      },
    });

    expect(broken.status).toBe(204);
  });
});
