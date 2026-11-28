/**
 * The one and only vocabulary for product analytics. Both the browser beacon
 * and the Pages Function validate against this list: anything not named here is
 * rejected, so free text (resume content, filenames, URLs, ids) can never reach
 * the analytics binding.
 *
 * Keep these curated lists local and dependency-free — the Cloudflare Function
 * imports this module relatively, outside the Next.js app and its `@/` alias.
 * When a preset/template id changes, update the matching list here.
 */

export const ANALYTICS_EVENT_META = {
  start_pdf_upload: [],
  start_preset: ["archetype"],
  start_blank: [],
  start_paste: [],
  start_ai_prompt: [],
  recent_open: [],
  recent_duplicate: [],
  editor_first_edit: [],
  section_added: ["section"],
  section_reordered: [],
  tool_tidy: [],
  tool_match_jd: [],
  tool_fit_1p: [],
  tool_6s_scan: [],
  tool_anonymize: [],
  tool_trim_tips: [],
  ats_copy: [],
  template_selected: ["template"],
  design_changed: ["setting"],
  pdf_export: [],
  json_export: ["format"],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENT_META;
export type AnalyticsMetaKey =
  (typeof ANALYTICS_EVENT_META)[AnalyticsEvent][number];
export type AnalyticsMeta = Partial<Record<AnalyticsMetaKey, string>>;

/** Known, non-identifying values for each allowed meta key. */
export const ANALYTICS_META_VALUES = {
  archetype: [
    "software-engineer",
    "product-manager",
    "ux-ui-designer",
    "finance-operations",
    "data-analyst",
    "fresh-graduate",
  ],
  section: [
    "summary",
    "profiles",
    "experience",
    "education",
    "projects",
    "skills",
    "certifications",
    "awards",
    "languages",
    "interests",
    "volunteer",
    "publications",
    "references",
    "custom",
  ],
  template: ["onyx", "persian", "bronzor", "chikorita", "azurill", "gengar"],
  setting: ["paper", "accent", "fonts", "density"],
  format: ["backup", "jsonresume"],
} as const satisfies Record<AnalyticsMetaKey, readonly string[]>;

const MAX_META_VALUE_LENGTH = 48;

export type ValidAnalyticsPayload = {
  ok: true;
  event: AnalyticsEvent;
  meta: Record<string, string>;
};

export type InvalidAnalyticsPayload = {
  ok: false;
  reason: string;
};

export type AnalyticsValidation =
  | ValidAnalyticsPayload
  | InvalidAnalyticsPayload;

function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ANALYTICS_EVENT_META, value)
  );
}

/**
 * Strict allowlist validation shared by the browser and the edge endpoint.
 * `meta` may only contain the keys named for that event, each with a short
 * string value drawn from `ANALYTICS_META_VALUES`. Objects, arrays, numbers,
 * extra keys, and unknown values are rejected — never coerced into a blob.
 */
export function validateAnalyticsEvent(
  event: unknown,
  meta: unknown,
): AnalyticsValidation {
  if (!isAnalyticsEvent(event)) {
    return { ok: false, reason: "unknown_event" };
  }

  if (meta === undefined || meta === null) {
    return { ok: true, event, meta: {} };
  }

  if (typeof meta !== "object" || Array.isArray(meta)) {
    return { ok: false, reason: "invalid_meta" };
  }

  const allowedKeys = ANALYTICS_EVENT_META[event] as readonly string[];
  const entries = Object.entries(meta as Record<string, unknown>);
  const normalized: Record<string, string> = {};

  for (const [key, value] of entries) {
    if (
      !allowedKeys.includes(key) ||
      typeof value !== "string" ||
      value.length === 0 ||
      value.length > MAX_META_VALUE_LENGTH
    ) {
      return { ok: false, reason: "invalid_meta" };
    }

    const values = ANALYTICS_META_VALUES[key as AnalyticsMetaKey];

    if (!values || !(values as readonly string[]).includes(value)) {
      return { ok: false, reason: "invalid_meta" };
    }

    normalized[key] = value;
  }

  return { ok: true, event, meta: normalized };
}

/** Stable, PII-free token for a meta record, used as one Analytics Engine blob. */
export function analyticsMetaToken(meta: Record<string, string>): string {
  const entries = Object.entries(meta).sort(([a], [b]) => a.localeCompare(b));

  return entries.length === 0
    ? "none"
    : entries.map(([key, value]) => `${key}:${value}`).join(",");
}
