/**
 * The complete, closed vocabulary for anonymous product analytics.
 *
 * Both the browser beacon (`trackEvent`) and the Cloudflare Pages Function
 * (`functions/api/event.ts`) import this module, so a typo or a new event can
 * never silently reach the server: anything outside these lists is rejected.
 *
 * Privacy contract: an event payload is exactly `{ event, meta, device }`.
 * `meta` is a short, fixed identifier from the list below — never resume text,
 * a file name, a URL, an email, or any other free text.
 */

export const ANALYTICS_EVENTS = [
  // Onboarding
  "start_pdf_upload",
  "start_preset",
  "start_blank",
  "start_paste",
  "start_ai_prompt",
  "recent_open",
  "recent_duplicate",
  // Activation
  "editor_first_edit",
  "section_added",
  "section_reordered",
  // Tools
  "tool_tidy",
  "tool_match_jd",
  "tool_fit_1p",
  "tool_6s_scan",
  "tool_anonymize",
  "tool_trim_tips",
  "ats_copy",
  // Design
  "template_selected",
  "design_changed",
  // Export
  "pdf_export",
  "json_export",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const ANALYTICS_DEVICES = ["mobile", "desktop"] as const;

export type AnalyticsDevice = (typeof ANALYTICS_DEVICES)[number];

/**
 * Per-event allowed `meta` values. `null` means the event carries no meta at
 * all. Keep these in sync with `ARCHETYPES` (preset ids) and `TEMPLATE_IDS`;
 * `events.test.ts` fails if they drift.
 */
export const ANALYTICS_META_VALUES = {
  start_pdf_upload: null,
  start_preset: [
    "software-engineer",
    "product-manager",
    "ux-ui-designer",
    "finance-operations",
    "data-analyst",
    "fresh-graduate",
  ],
  start_blank: null,
  start_paste: null,
  start_ai_prompt: null,
  recent_open: null,
  recent_duplicate: null,
  editor_first_edit: null,
  section_added: ["optional", "custom"],
  section_reordered: ["drag", "keyboard"],
  tool_tidy: null,
  tool_match_jd: null,
  tool_fit_1p: ["fit", "reset"],
  tool_6s_scan: ["on", "off"],
  tool_anonymize: ["on", "off"],
  tool_trim_tips: null,
  ats_copy: ["all", "header", "section", "entry"],
  template_selected: ["onyx", "persian", "bronzor", "chikorita", "azurill", "gengar"],
  design_changed: ["paper", "accent", "font", "density"],
  pdf_export: ["a4", "letter"],
  json_export: ["backup", "jsonresume"],
} as const satisfies Record<AnalyticsEvent, readonly string[] | null>;

type MetaValuesOf<T> = T extends readonly (infer Value)[] ? Value : never;

/** Union of every allowed meta identifier across all events. */
export type AnalyticsMeta = MetaValuesOf<
  NonNullable<(typeof ANALYTICS_META_VALUES)[AnalyticsEvent]>
>;

export type AnalyticsPayload = {
  event: AnalyticsEvent;
  meta: string | null;
  device: AnalyticsDevice;
};

const PAYLOAD_KEYS = ["event", "meta", "device"] as const;

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return (
    typeof value === "string" &&
    (ANALYTICS_EVENTS as readonly string[]).includes(value)
  );
}

export function isAnalyticsDevice(value: unknown): value is AnalyticsDevice {
  return (
    typeof value === "string" &&
    (ANALYTICS_DEVICES as readonly string[]).includes(value)
  );
}

/** True when `meta` is one of the fixed identifiers this event may carry. */
export function isAllowedMetaValue(
  event: AnalyticsEvent,
  meta: string,
): boolean {
  const allowed = ANALYTICS_META_VALUES[event];

  return allowed !== null && (allowed as readonly string[]).includes(meta);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Strict server-side (and defensive client-side) payload parser.
 *
 * Rejects unknown events, unknown or free-text meta, unknown keys (so a future
 * bug cannot leak a resume field), a missing `meta` key, and a bad device.
 */
export function parseAnalyticsPayload(
  input: unknown,
): AnalyticsPayload | null {
  if (!isRecord(input)) {
    return null;
  }

  const keys = Object.keys(input);

  if (
    keys.length !== PAYLOAD_KEYS.length ||
    keys.some((key) => !(PAYLOAD_KEYS as readonly string[]).includes(key))
  ) {
    return null;
  }

  if (!isAnalyticsEvent(input.event) || !isAnalyticsDevice(input.device)) {
    return null;
  }

  const meta = input.meta;

  if (meta === null) {
    return { event: input.event, meta: null, device: input.device };
  }

  if (typeof meta !== "string" || !isAllowedMetaValue(input.event, meta)) {
    return null;
  }

  return { event: input.event, meta, device: input.device };
}
