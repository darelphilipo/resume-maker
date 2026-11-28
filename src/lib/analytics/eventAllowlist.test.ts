import { describe, expect, it } from "vitest";

import {
  analyticsMetaToken,
  validateAnalyticsEvent,
} from "./eventAllowlist";

describe("validateAnalyticsEvent", () => {
  it("accepts an allowlisted event without meta", () => {
    expect(validateAnalyticsEvent("start_blank", undefined)).toEqual({
      ok: true,
      event: "start_blank",
      meta: {},
    });
  });

  it("accepts enumerated meta for preset, template, design, and export", () => {
    expect(
      validateAnalyticsEvent("start_preset", { archetype: "data-analyst" }),
    ).toMatchObject({ ok: true, meta: { archetype: "data-analyst" } });
    expect(
      validateAnalyticsEvent("template_selected", { template: "gengar" }),
    ).toMatchObject({ ok: true, meta: { template: "gengar" } });
    expect(
      validateAnalyticsEvent("design_changed", { setting: "density" }),
    ).toMatchObject({ ok: true, meta: { setting: "density" } });
    expect(
      validateAnalyticsEvent("json_export", { format: "backup" }),
    ).toMatchObject({ ok: true, meta: { format: "backup" } });
  });

  it("rejects unknown events", () => {
    expect(validateAnalyticsEvent("resume_text_uploaded", {})).toEqual({
      ok: false,
      reason: "unknown_event",
    });
    expect(validateAnalyticsEvent("", undefined)).toEqual({
      ok: false,
      reason: "unknown_event",
    });
    expect(validateAnalyticsEvent(42, undefined)).toEqual({
      ok: false,
      reason: "unknown_event",
    });
  });

  it("rejects free-text, extra keys, and non-string meta values", () => {
    expect(
      validateAnalyticsEvent("start_preset", { archetype: "Ada Lovelace" }),
    ).toEqual({ ok: false, reason: "invalid_meta" });
    expect(
      validateAnalyticsEvent("start_blank", { archetype: "data-analyst" }),
    ).toEqual({ ok: false, reason: "invalid_meta" });
    expect(
      validateAnalyticsEvent("start_preset", {
        archetype: "data-analyst",
        name: "Ada",
      }),
    ).toEqual({ ok: false, reason: "invalid_meta" });
    expect(validateAnalyticsEvent("start_preset", { archetype: 7 })).toEqual({
      ok: false,
      reason: "invalid_meta",
    });
    expect(validateAnalyticsEvent("tool_tidy", "yes")).toEqual({
      ok: false,
      reason: "invalid_meta",
    });
    expect(validateAnalyticsEvent("tool_tidy", ["yes"])).toEqual({
      ok: false,
      reason: "invalid_meta",
    });
    expect(
      validateAnalyticsEvent("start_preset", { archetype: "x".repeat(49) }),
    ).toEqual({ ok: false, reason: "invalid_meta" });
  });
});

describe("analyticsMetaToken", () => {
  it("is stable regardless of key order and never contains free text", () => {
    expect(analyticsMetaToken({})).toBe("none");
    expect(analyticsMetaToken({ format: "backup", setting: "paper" })).toBe(
      "format:backup,setting:paper",
    );
    expect(
      analyticsMetaToken({ setting: "paper", format: "backup" }),
    ).toBe("format:backup,setting:paper");
  });
});
