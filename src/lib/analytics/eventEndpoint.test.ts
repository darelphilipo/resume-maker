import { describe, expect, it, vi } from "vitest";

import {
  onRequestPost,
  type AnalyticsEnv,
} from "../../../functions/api/event";

function post(body: unknown, env: AnalyticsEnv, headers?: HeadersInit) {
  return onRequestPost({
    env,
    request: new Request("https://resume.example/api/event", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        cookie: "session=very-secret",
        ...Object.fromEntries(new Headers(headers)),
      },
      body: JSON.stringify(body),
    }),
  });
}

describe("functions/api/event", () => {
  it("writes only allowlisted, non-identifying blobs", async () => {
    const writeDataPoint = vi.fn();
    const response = await post(
      {
        event: "template_selected",
        meta: { template: "gengar" },
        device: "mobile",
      },
      { ANALYTICS: { writeDataPoint } },
    );

    expect(response.status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: ["template_selected", "template:gengar", "mobile", "android", "chrome"],
      indexes: ["template_selected"],
    });
    // The cookie and the raw User-Agent must never reach the data point.
    const json = JSON.stringify(writeDataPoint.mock.calls[0]);
    expect(json).not.toContain("session=");
    expect(json).not.toContain("Mozilla/5.0");
  });

  it("rejects unknown events, free-text meta, and bad devices with 400", async () => {
    const writeDataPoint = vi.fn();
    const env = { ANALYTICS: { writeDataPoint } };

    expect(
      (
        await post({ event: "resume_text_uploaded", device: "mobile" }, env)
      ).status,
    ).toBe(400);
    expect(
      (
        await post(
          {
            event: "start_preset",
            meta: { archetype: "Ada Lovelace" },
            device: "mobile",
          },
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await post({ event: "start_blank", device: "robot" }, env)
      ).status,
    ).toBe(400);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });

  it("rejects malformed bodies and returns 204 without a binding", async () => {
    const response = await onRequestPost({
      env: {},
      request: new Request("https://resume.example/api/event", {
        method: "POST",
        body: "not json",
      }),
    });
    expect(response.status).toBe(400);

    expect(
      (
        await post({ event: "start_blank", device: "desktop" }, {})
      ).status,
    ).toBe(204);
  });
});
