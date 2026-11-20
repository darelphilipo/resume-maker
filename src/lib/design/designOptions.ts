import type { DensityId } from "@/lib/schema/resume.schema";

/**
 * User-facing design choices. The values written into the document reuse the
 * existing `design.colors`, `typography` and `page` fields, so preview,
 * measurement and print keep reading the same source of truth — no extra CSS
 * variables or parallel renderer are needed.
 */

export type AccentId =
  | "mono"
  | "navy"
  | "teal"
  | "forest"
  | "terracotta"
  | "rose"
  | "plum"
  | "indigo";

export type AccentSwatch = {
  id: AccentId;
  label: string;
  hex: string;
};

/**
 * Seven curated accents plus the neutral default, ordered by hue so the
 * two-column grid fills evenly instead of leaving a lone card on the last row.
 */
export const ACCENT_SWATCHES: readonly AccentSwatch[] = [
  { id: "mono", label: "Monochrome", hex: "#1f2937" },
  { id: "navy", label: "Navy", hex: "#1b3a57" },
  { id: "teal", label: "Teal", hex: "#0f766e" },
  { id: "forest", label: "Forest", hex: "#166534" },
  { id: "terracotta", label: "Terracotta", hex: "#a34a2c" },
  { id: "rose", label: "Rose", hex: "#be123c" },
  { id: "plum", label: "Plum", hex: "#7c3f66" },
  { id: "indigo", label: "Indigo", hex: "#4338ca" },
];

export type FontPairingId = "sans" | "serif" | "classic";

export type FontPairing = {
  id: FontPairingId;
  label: string;
  description: string;
  body: string;
  heading: string;
};

/**
 * `--font-sans` / `--font-serif` are defined in `globals.css` and backed by
 * locally bundled fonts in `layout.tsx`, so these pairings work offline and in
 * the static export without fetching anything.
 */
export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    id: "sans",
    label: "Sans",
    description: "Clean sans serif throughout.",
    body: "var(--font-sans)",
    heading: "var(--font-sans)",
  },
  {
    id: "serif",
    label: "Serif",
    description: "Traditional serif throughout.",
    body: "var(--font-serif)",
    heading: "var(--font-serif)",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Serif headings over a sans-serif body.",
    body: "var(--font-sans)",
    heading: "var(--font-serif)",
  },
];

export type DensityPreset = {
  id: DensityId;
  label: string;
  description: string;
  gapX: number;
  gapY: number;
  lineHeight: number;
};

/** `normal` matches the schema defaults; the others only change spacing. */
export const DENSITY_PRESETS: readonly DensityPreset[] = [
  {
    id: "compact",
    label: "Compact",
    description: "Tighter lines and gaps to fit more in.",
    gapX: 5,
    gapY: 8,
    lineHeight: 1.25,
  },
  {
    id: "normal",
    label: "Normal",
    description: "Balanced spacing for most resumes.",
    gapX: 8,
    gapY: 12,
    lineHeight: 1.4,
  },
  {
    id: "relaxed",
    label: "Relaxed",
    description: "More room between lines and sections.",
    gapX: 11,
    gapY: 16,
    lineHeight: 1.55,
  },
];

export function resolveAccentId(primary: string): AccentId {
  const match = ACCENT_SWATCHES.find(
    (swatch) => swatch.hex.toLowerCase() === primary.trim().toLowerCase(),
  );

  return match?.id ?? "mono";
}

export function resolveFontPairingId(
  body: string,
  heading: string,
): FontPairingId {
  const match = FONT_PAIRINGS.find(
    (pairing) => pairing.body === body && pairing.heading === heading,
  );

  return match?.id ?? "sans";
}

/**
 * Density is stored as `design.density`, but resumes saved before that field
 * existed (and docs whose spacing was written directly) have no enum value at
 * runtime. Fall back to the preset whose spacing matches the document, then to
 * `normal`, so one Density card is always selected.
 */
export function resolveDensityId(
  density: string | undefined,
  gapY: number,
  lineHeight: number,
): DensityId {
  if (DENSITY_PRESETS.some((preset) => preset.id === density)) {
    return density as DensityId;
  }

  const spacingMatch = DENSITY_PRESETS.find(
    (preset) => preset.gapY === gapY && preset.lineHeight === lineHeight,
  );

  return spacingMatch?.id ?? "normal";
}
