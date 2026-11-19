import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import {
  ACCENT_SWATCHES,
  DENSITY_PRESETS,
  FONT_PAIRINGS,
  resolveAccentId,
  resolveFontPairingId,
} from "./designOptions";

describe("design options", () => {
  it("offers six curated accents plus the monochrome default", () => {
    expect(ACCENT_SWATCHES).toHaveLength(7);
    expect(new Set(ACCENT_SWATCHES.map((swatch) => swatch.id)).size).toBe(7);
    expect(new Set(ACCENT_SWATCHES.map((swatch) => swatch.hex)).size).toBe(7);

    const doc = createEmptyResume();
    expect(ACCENT_SWATCHES[0]).toMatchObject({
      id: "mono",
      hex: doc.metadata.design.colors.primary,
    });
  });

  it("resolves an accent by hex, ignoring case and surrounding space", () => {
    const teal = ACCENT_SWATCHES.find((swatch) => swatch.id === "teal");
    expect(teal).toBeDefined();
    expect(resolveAccentId(teal!.hex.toUpperCase())).toBe("teal");
    expect(resolveAccentId(`  ${teal!.hex}  `)).toBe("teal");
    expect(resolveAccentId("#not-a-swatch")).toBe("mono");
  });

  it("offers the three font pairings and resolves each one", () => {
    expect(FONT_PAIRINGS.map((pairing) => pairing.id)).toEqual([
      "sans",
      "serif",
      "classic",
    ]);

    for (const pairing of FONT_PAIRINGS) {
      expect(resolveFontPairingId(pairing.body, pairing.heading)).toBe(
        pairing.id,
      );
    }

    expect(FONT_PAIRINGS.find((pairing) => pairing.id === "classic")).toMatchObject({
      body: "var(--font-sans)",
      heading: "var(--font-serif)",
    });
    expect(resolveFontPairingId("ui-sans-serif", "inherit")).toBe("sans");
  });

  it("keeps Normal aligned with the schema defaults and orders density spacing", () => {
    const doc = createEmptyResume();
    const normal = DENSITY_PRESETS.find((preset) => preset.id === "normal");
    expect(normal).toMatchObject({
      gapX: doc.metadata.page.gapX,
      gapY: doc.metadata.page.gapY,
      lineHeight: doc.metadata.typography.body.lineHeight,
    });

    expect(DENSITY_PRESETS.map((preset) => preset.id)).toEqual([
      "compact",
      "normal",
      "relaxed",
    ]);

    for (let index = 1; index < DENSITY_PRESETS.length; index += 1) {
      const previous = DENSITY_PRESETS[index - 1];
      const current = DENSITY_PRESETS[index];
      expect(current.gapY).toBeGreaterThan(previous.gapY);
      expect(current.lineHeight).toBeGreaterThan(previous.lineHeight);
    }
  });
});
