import {
  ANALYTICS_ENDPOINT,
  isLocalHostname,
  resolveDevice,
  shouldTrack,
  trackEvent,
  type TrackEnvironment,
} from "./trackEvent";

function environment(
  overrides: Partial<TrackEnvironment> = {},
): TrackEnvironment & { sent: string[] } {
  const sent: string[] = [];

  return {
    doNotTrack: null,
    globalDoNotTrack: null,
    onLine: true,
    hostname: "resume.example.com",
    device: "mobile",
    send(body: string) {
      sent.push(body);
    },
    sent,
    ...overrides,
  };
}

describe("shouldTrack", () => {
  it("tracks on a normal online page", () => {
    expect(
      shouldTrack({
        doNotTrack: null,
        globalDoNotTrack: null,
        onLine: true,
        hostname: "resume.example.com",
      }),
    ).toBe(true);
  });

  it("honours Do Not Track from navigator or window", () => {
    expect(
      shouldTrack({
        doNotTrack: "1",
        globalDoNotTrack: null,
        onLine: true,
        hostname: "resume.example.com",
      }),
    ).toBe(false);

    expect(
      shouldTrack({
        doNotTrack: null,
        globalDoNotTrack: "1",
        onLine: true,
        hostname: "resume.example.com",
      }),
    ).toBe(false);
  });

  it("does not track while offline", () => {
    expect(
      shouldTrack({
        doNotTrack: null,
        globalDoNotTrack: null,
        onLine: false,
        hostname: "resume.example.com",
      }),
    ).toBe(false);
  });

  it("does not track on local development hosts", () => {
    for (const hostname of [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "[::1]",
      "app.localhost",
    ]) {
      expect(isLocalHostname(hostname)).toBe(true);
      expect(
        shouldTrack({
          doNotTrack: null,
          globalDoNotTrack: null,
          onLine: true,
          hostname,
        }),
      ).toBe(false);
    }

    expect(isLocalHostname("resume.example.com")).toBe(false);
  });
});

describe("resolveDevice", () => {
  it("uses the pointer type first, then the viewport width", () => {
    expect(resolveDevice(true, 1440)).toBe("mobile");
    expect(resolveDevice(false, 390)).toBe("mobile");
    expect(resolveDevice(false, 1024)).toBe("desktop");
    expect(resolveDevice(false, 1440)).toBe("desktop");
  });
});

describe("trackEvent", () => {
  it("sends exactly the closed event/meta/device payload", () => {
    const env = environment({ device: "desktop" });

    trackEvent("pdf_export", "a4", env);

    expect(env.sent).toHaveLength(1);
    expect(JSON.parse(env.sent[0])).toEqual({
      event: "pdf_export",
      meta: "a4",
      device: "desktop",
    });
    expect(Object.keys(JSON.parse(env.sent[0]))).toEqual([
      "event",
      "meta",
      "device",
    ]);
  });

  it("sends a null meta for events that carry none", () => {
    const env = environment();

    trackEvent("editor_first_edit", undefined, env);

    expect(JSON.parse(env.sent[0])).toEqual({
      event: "editor_first_edit",
      meta: null,
      device: "mobile",
    });
  });

  it("does not send when Do Not Track is on", () => {
    const env = environment({ doNotTrack: "1" });

    trackEvent("ats_copy", "all", env);

    expect(env.sent).toHaveLength(0);
  });

  it("does not send from localhost", () => {
    const env = environment({ hostname: "localhost" });

    trackEvent("ats_copy", "all", env);

    expect(env.sent).toHaveLength(0);
  });

  it("does not send while offline", () => {
    const env = environment({ onLine: false });

    trackEvent("ats_copy", "all", env);

    expect(env.sent).toHaveLength(0);
  });

  it("rejects an unknown event or an unowned meta at runtime", () => {
    const env = environment();

    trackEvent(
      "start_pdf_upload" as never,
      "Ada Lovelace" as never,
      env,
    );
    trackEvent("template_selected", "resume.pdf" as never, env);
    trackEvent("start_blank", "custom" as never, env);

    expect(env.sent).toHaveLength(0);
  });

  it("never throws when the transport fails", () => {
    const env = environment({
      send() {
        throw new Error("blocked by an extension");
      },
    });

    expect(() => trackEvent("json_export", "backup", env)).not.toThrow();
  });

  it("no-ops when no browser environment exists", () => {
    expect(() => trackEvent("json_export", "backup", null)).not.toThrow();
  });

  it("posts to the Cloudflare Pages route", () => {
    expect(ANALYTICS_ENDPOINT).toBe("/api/event");
  });
});
