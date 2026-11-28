import { ARCHETYPES } from "@/lib/presets/archetypes";
import { TEMPLATE_LIST } from "@/templates/registry";

import {
  ANALYTICS_DEVICES,
  ANALYTICS_EVENTS,
  ANALYTICS_META_VALUES,
  isAllowedMetaValue,
  isAnalyticsDevice,
  isAnalyticsEvent,
  parseAnalyticsPayload,
} from "./events";

describe("parseAnalyticsPayload", () => {
  it("accepts every event with its allowed meta or a null meta", () => {
    for (const event of ANALYTICS_EVENTS) {
      const allowed = ANALYTICS_META_VALUES[event];

      expect(
        parseAnalyticsPayload({ event, meta: null, device: "mobile" }),
      ).toEqual({ event, meta: null, device: "mobile" });

      for (const meta of allowed ?? []) {
        expect(
          parseAnalyticsPayload({ event, meta, device: "desktop" }),
        ).toEqual({ event, meta, device: "desktop" });
      }
    }
  });

  it("rejects an unknown event", () => {
    expect(
      parseAnalyticsPayload({
        event: "stole_resume_text",
        meta: null,
        device: "mobile",
      }),
    ).toBeNull();
  });

  it("rejects free-text meta and meta the event does not own", () => {
    expect(
      parseAnalyticsPayload({
        event: "start_blank",
        meta: "Ada Lovelace ada@example.com",
        device: "mobile",
      }),
    ).toBeNull();

    expect(
      parseAnalyticsPayload({
        event: "template_selected",
        meta: "resume.pdf",
        device: "mobile",
      }),
    ).toBeNull();

    expect(
      parseAnalyticsPayload({
        event: "start_blank",
        meta: "custom",
        device: "mobile",
      }),
    ).toBeNull();
  });

  it("rejects any extra key, so a resume field cannot ride along", () => {
    expect(
      parseAnalyticsPayload({
        event: "pdf_export",
        meta: "a4",
        device: "mobile",
        name: "Ada Lovelace",
      }),
    ).toBeNull();

    expect(
      parseAnalyticsPayload({
        event: "pdf_export",
        meta: "a4",
        device: "mobile",
        url: "https://example.com",
      }),
    ).toBeNull();
  });

  it("requires the meta key and a known device", () => {
    expect(
      parseAnalyticsPayload({ event: "pdf_export", device: "mobile" }),
    ).toBeNull();

    expect(
      parseAnalyticsPayload({ event: "pdf_export", meta: null, device: "tablet" }),
    ).toBeNull();

    expect(
      parseAnalyticsPayload({ event: "pdf_export", meta: null, device: "mobile" }),
    ).toEqual({ event: "pdf_export", meta: null, device: "mobile" });
  });

  it("rejects non-object payloads", () => {
    expect(parseAnalyticsPayload(null)).toBeNull();
    expect(parseAnalyticsPayload("pdf_export")).toBeNull();
    expect(parseAnalyticsPayload([])).toBeNull();
    expect(parseAnalyticsPayload(42)).toBeNull();
  });

  it("exposes only the documented devices", () => {
    expect(ANALYTICS_DEVICES).toEqual(["mobile", "desktop"]);
    expect(isAnalyticsDevice("mobile")).toBe(true);
    expect(isAnalyticsDevice("desktop")).toBe(true);
    expect(isAnalyticsDevice("tablet")).toBe(false);
  });

  it("guards event and meta lookups", () => {
    expect(isAnalyticsEvent("ats_copy")).toBe(true);
    expect(isAnalyticsEvent("download_everything")).toBe(false);
    expect(isAllowedMetaValue("ats_copy", "entry")).toBe(true);
    expect(isAllowedMetaValue("ats_copy", "Ada")).toBe(false);
    expect(isAllowedMetaValue("start_blank", "anything")).toBe(false);
  });
});

describe("analytics vocabulary stays in sync with the app", () => {
  it("lists the real template ids", () => {
    expect([...ANALYTICS_META_VALUES.template_selected].sort()).toEqual(
      TEMPLATE_LIST.map((template) => template.id).sort(),
    );
  });

  it("lists the real preset ids", () => {
    expect([...ANALYTICS_META_VALUES.start_preset].sort()).toEqual(
      ARCHETYPES.map((archetype) => archetype.id).sort(),
    );
  });
});
