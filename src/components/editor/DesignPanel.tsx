"use client";

import { Check } from "@phosphor-icons/react";

import {
  ACCENT_SWATCHES,
  DENSITY_PRESETS,
  FONT_PAIRINGS,
  resolveAccentId,
  resolveDensityId,
  resolveFontPairingId,
} from "@/lib/design/designOptions";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";
import { TemplateBadge } from "@/templates/shared/TemplateBadge";
import { getTemplate, TEMPLATE_LIST } from "@/templates/registry";

type PageFormat = ResumeDocument["metadata"]["page"]["format"];

const PAGE_FORMATS: readonly { id: PageFormat; label: string; detail: string }[] =
  [
    { id: "a4", label: "A4", detail: "210 × 297 mm" },
    { id: "letter", label: "Letter", detail: "8.5 × 11 in" },
  ];

// `relative` anchors the `sr-only` radios to their own tap target. Without a
// positioned ancestor, focusing a clipped input makes the browser scroll the
// document to its static position, which slides the mobile bottom nav into
// mid-screen.
function cardClass(isCurrent: boolean): string {
  return `relative flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
    isCurrent
      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
      : "border-line hover:border-black/30"
  }`;
}

// Paper size, Font pairing, and Density are short mutually exclusive choices,
// so one compact segmented track keeps them scannable without stacking six
// full-width radio cards above the template list.
const SEGMENT_ROW_CLASS =
  "mt-1 flex w-full min-w-0 gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5";

function segmentClass(isCurrent: boolean): string {
  return `relative flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1 text-center text-xs font-medium transition-colors pointer-coarse:min-h-11 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 ${
    isCurrent ? "bg-primary text-white shadow-sm" : "text-text hover:bg-black/5"
  }`;
}

/**
 * Each pairing name previews its own heading typeface. The explicit utility
 * class backs up the inline family: the Design panel heading is serif, and a
 * label that only relied on the inherited face would render `Sans` in serif on
 * phones (and anywhere an inline style is stripped).
 */
function fontPairingLabelClass(heading: string): string {
  return heading === "var(--font-serif)" ? "font-serif" : "font-sans";
}

const ACCENT_GRID_CLASS = "mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-8";

// A fixed square keeps the `focus-within` ring a true circle. A stretched grid
// cell made the ring an oval around the circular dot on wide cards.
const ACCENT_TARGET_CLASS =
  "relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center justify-self-center rounded-full transition-colors pointer-coarse:h-11 pointer-coarse:w-11 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1";

function accentDotClass(isCurrent: boolean): string {
  return `flex h-7 w-7 items-center justify-center rounded-full border border-black/10 transition-shadow ${
    isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : ""
  }`;
}

export function DesignPanel() {
  const format = useResumeStore((state) => state.doc.metadata.page.format);
  const templateId = useResumeStore((state) => state.doc.metadata.template);
  const primary = useResumeStore(
    (state) => state.doc.metadata.design.colors.primary,
  );
  const bodyFont = useResumeStore(
    (state) => state.doc.metadata.typography.body.fontFamily,
  );
  const headingFont = useResumeStore(
    (state) => state.doc.metadata.typography.heading.fontFamily,
  );
  const density = useResumeStore((state) => state.doc.metadata.design.density);
  const densityGapY = useResumeStore((state) => state.doc.metadata.page.gapY);
  const densityLineHeight = useResumeStore(
    (state) => state.doc.metadata.typography.body.lineHeight,
  );
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const currentTemplate = getTemplate(templateId);
  const accentId = resolveAccentId(primary);
  const activeAccent =
    ACCENT_SWATCHES.find((swatch) => swatch.id === accentId) ??
    ACCENT_SWATCHES[0];
  const pairingId = resolveFontPairingId(bodyFont, headingFont);
  const densityId = resolveDensityId(density, densityGapY, densityLineHeight);

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2" data-design-section="paper">
        <legend className="text-sm font-medium">Paper size</legend>
        <p className="text-xs text-muted">
          The preview and printed PDF use this page size.
        </p>
        <div className={SEGMENT_ROW_CLASS} data-segmented-row="paper">
          {PAGE_FORMATS.map((pageFormat) => {
            const isCurrent = format === pageFormat.id;
            const inputId = `page-format-${pageFormat.id}`;

            return (
              <label
                key={pageFormat.id}
                htmlFor={inputId}
                title={pageFormat.detail}
                className={segmentClass(isCurrent)}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="page-format"
                  value={pageFormat.id}
                  checked={isCurrent}
                  onChange={() =>
                    patchDoc({
                      metadata: { page: { format: pageFormat.id } },
                    })
                  }
                  className="sr-only"
                />
                <span className="whitespace-nowrap">{pageFormat.label}</span>
                <span className="sr-only"> {pageFormat.detail}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Template</legend>
        <p className="text-xs text-muted">
          Five single-column templates are ATS-Safe. Studio Sidebar is built for
          direct human review.
        </p>
        <div className="mt-1 grid gap-2">
          {TEMPLATE_LIST.map((template) => {
            const isCurrent = currentTemplate.id === template.id;
            const inputId = `template-${template.id}`;

            return (
              <label
                key={template.id}
                htmlFor={inputId}
                className={`${cardClass(isCurrent)} items-start`}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="resume-template"
                  value={template.id}
                  checked={isCurrent}
                  onChange={() =>
                    patchDoc({ metadata: { template: template.id } })
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span
                    data-template-title-row=""
                    className="flex items-start justify-between gap-2"
                  >
                    <span className="min-w-0 font-medium leading-snug">
                      {template.label}
                    </span>
                    <TemplateBadge template={template} />
                  </span>
                  <span className="text-xs text-muted">
                    {template.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2" data-design-section="accent">
        <legend className="text-sm font-medium">
          Accent color
          <span
            data-accent-name=""
            className="font-normal text-muted"
          >
            {" · "}
            {activeAccent.label}
          </span>
        </legend>
        <p className="text-xs text-muted">
          Used for section rules, highlights, and tags. Your text stays dark and
          readable.
        </p>
        <div className={ACCENT_GRID_CLASS} data-accent-strip="">
          {ACCENT_SWATCHES.map((swatch) => {
            const isCurrent = accentId === swatch.id;
            const inputId = `accent-${swatch.id}`;

            return (
              <label
                key={swatch.id}
                htmlFor={inputId}
                title={swatch.label}
                className={ACCENT_TARGET_CLASS}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="accent-color"
                  value={swatch.id}
                  aria-label={swatch.label}
                  checked={isCurrent}
                  onChange={() =>
                    patchDoc({
                      metadata: { design: { colors: { primary: swatch.hex } } },
                    })
                  }
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  data-accent-dot=""
                  className={accentDotClass(isCurrent)}
                  style={{ backgroundColor: swatch.hex }}
                >
                  {isCurrent ? (
                    <Check
                      aria-hidden="true"
                      data-accent-check=""
                      size={14}
                      weight="bold"
                      className="text-white drop-shadow-sm"
                    />
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2" data-design-section="fonts">
        <legend className="text-sm font-medium">Font pairing</legend>
        <p className="text-xs text-muted">
          Sans is cleanest for ATS; Serif and Classic add a more editorial feel.
        </p>
        <div className={SEGMENT_ROW_CLASS} data-segmented-row="fonts">
          {FONT_PAIRINGS.map((pairing) => {
            const isCurrent = pairingId === pairing.id;
            const inputId = `font-pairing-${pairing.id}`;

            return (
              <label
                key={pairing.id}
                htmlFor={inputId}
                title={pairing.description}
                className={segmentClass(isCurrent)}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="font-pairing"
                  value={pairing.id}
                  checked={isCurrent}
                  onChange={() =>
                    patchDoc({
                      metadata: {
                        typography: {
                          body: { fontFamily: pairing.body },
                          heading: { fontFamily: pairing.heading },
                        },
                      },
                    })
                  }
                  className="sr-only"
                />
                <span
                  className={`whitespace-nowrap ${fontPairingLabelClass(
                    pairing.heading,
                  )}`}
                  style={{ fontFamily: pairing.heading }}
                >
                  {pairing.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2" data-design-section="density">
        <legend className="text-sm font-medium">Density</legend>
        <p className="text-xs text-muted">
          Controls line height and the space between sections. Changing it
          re-measures the preview and the PDF.
        </p>
        <div className={SEGMENT_ROW_CLASS} data-segmented-row="density">
          {DENSITY_PRESETS.map((preset) => {
            const isCurrent = densityId === preset.id;
            const inputId = `density-${preset.id}`;

            return (
              <label
                key={preset.id}
                htmlFor={inputId}
                title={preset.description}
                className={segmentClass(isCurrent)}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="density"
                  value={preset.id}
                  checked={isCurrent}
                  onChange={() =>
                    patchDoc({
                      metadata: {
                        design: { density: preset.id },
                        page: { gapX: preset.gapX, gapY: preset.gapY },
                        typography: { body: { lineHeight: preset.lineHeight } },
                      },
                    })
                  }
                  className="sr-only"
                />
                <span className="whitespace-nowrap">{preset.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
