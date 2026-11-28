import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyticsEndpoint,
  deviceClass,
  trackEvent,
  type BeaconEnv,
} from "./trackEvent";

function env(overrides: Partial<BeaconEnv> = {}): BeaconEnv {
  const beacon = vi.fn((_url: string, _body: BodyInit | null | undefined) => true);

  return {
    hostname: "resume.example",
    pathname: "/",
    doNotTrack: undefined,
    onLine: true,
    coarse: false,
    sendBeacon: beacon,
    enabled: true,
    ...overrides,
  };
}

const originalTouchPoints = navigator.maxTouchPoints;

afterEach(() => {
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    value: originalTouchPoints,
  });
});

describe("analyticsEndpoint", () => {
  it("respects the GitHub Pages base path and the editor route", () => {
    expect(analyticsEndpoint("/")).toBe("/api/event");
    expect(analyticsEndpoint("/resume-maker/")).toBe(
      "/resume-maker/api/event",
    );
    expect(analyticsEndpoint("/resume-maker/editor/")).toBe(
      "/resume-maker/api/event",
    );
  });
});

describe("deviceClass", () => {
  it("maps coarse pointers to mobile and fine pointers to desktop", () => {
    expect(deviceClass()).toBe("desktop");

    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
    expect(deviceClass()).toBe("mobile");
  });
});

describe("trackEvent", () => {
  it("does nothing unless the deployment opts into the counter", () => {
    const context = env({ enabled: false });

    trackEvent("start_blank", undefined, context);

    expect(context.sendBeacon).not.toHaveBeenCalled();
  });

  it("does nothing on localhost", () => {
    const context = env({ hostname: "localhost" });

    trackEvent("start_blank", undefined, context);

    expect(context.sendBeacon).not.toHaveBeenCalled();
  });

  it("honours Do Not Track and offline mode", () => {
    const dnt = env({ doNotTrack: "1" });
    trackEvent("start_pdf_upload", undefined, dnt);
    expect(dnt.sendBeacon).not.toHaveBeenCalled();

    const offline = env({ onLine: false });
    trackEvent("start_pdf_upload", undefined, offline);
    expect(offline.sendBeacon).not.toHaveBeenCalled();
  });

  it("does nothing when sendBeacon is unavailable or no browser exists", () => {
    expect(() =>
      trackEvent("start_blank", undefined, env({ sendBeacon: undefined })),
    ).not.toThrow();
    expect(() => trackEvent("start_blank", undefined, null)).not.toThrow();
  });

  it("sends only the allowlisted event, meta, and coarse device", async () => {
    const beacon = vi.fn((_url: string, _body: BodyInit | null | undefined) => true);
    const context = env({
      pathname: "/resume-maker/editor/?id=1",
      coarse: true,
      sendBeacon: beacon,
    });

    trackEvent("start_preset", { archetype: "data-analyst" }, context);

    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, payload] = beacon.mock.calls[0];
    expect(url).toBe("/resume-maker/api/event");
    expect(typeof payload).toBe("string");
    expect(JSON.parse(String(payload))).toEqual({
      event: "start_preset",
      meta: { archetype: "data-analyst" },
      device: "mobile",
    });
  });

  it("drops unknown events and free-text meta client-side", () => {
    const context = env();

    trackEvent("resume_text" as "start_blank", undefined, context);
    trackEvent("start_preset", { archetype: "Ada Lovelace" }, context);

    expect(context.sendBeacon).not.toHaveBeenCalled();
  });

  it("never throws when a blocked beacon rejects", () => {
    const context = env({
      sendBeacon: () => {
        throw new Error("blocked");
      },
    });

    expect(() => trackEvent("start_blank", undefined, context)).not.toThrow();
  });
});
