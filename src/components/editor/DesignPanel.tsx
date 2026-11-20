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

function cardClass(isCurrent: boolean): string {
  return `flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
    isCurrent
      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
      : "border-line hover:border-black/30"
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
  const pairingId = resolveFontPairingId(bodyFont, headingFont);
  const densityId = resolveDensityId(density, densityGapY, densityLineHeight);

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Paper size</legend>
        <p className="text-xs text-muted">
          The preview and printed PDF use this page size.
        </p>
        <div className="mt-1 grid gap-2">
          {PAGE_FORMATS.map((pageFormat) => {
            const isCurrent = format === pageFormat.id;
            const inputId = `page-format-${pageFormat.id}`;

            return (
              <label
                key={pageFormat.id}
                htmlFor={inputId}
                className={cardClass(isCurrent)}
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
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="font-medium">{pageFormat.label}</span>
                  <span className="text-xs text-muted">
                    {pageFormat.detail}
                  </span>
                </span>
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

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Accent color</legend>
        <p className="text-xs text-muted">
          Used for section rules, highlights, and tags. Your text stays dark and
          readable.
        </p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {ACCENT_SWATCHES.map((swatch) => {
            const isCurrent = accentId === swatch.id;
            const inputId = `accent-${swatch.id}`;

            return (
              <label
                key={swatch.id}
                htmlFor={inputId}
                className={`${cardClass(isCurrent)} flex-wrap`}
              >
                <input
                  id={inputId}
                  type="radio"
                  name="accent-color"
                  value={swatch.id}
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
                  className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: swatch.hex }}
                />
                {isCurrent ? (
                  <Check
                    aria-hidden="true"
                    data-accent-check=""
                    size={14}
                    weight="bold"
                    className="ml-auto shrink-0 text-primary"
                  />
                ) : null}
                <span className="w-full whitespace-nowrap text-xs leading-tight">
                  {swatch.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Font pairing</legend>
        <p className="text-xs text-muted">
          Sans is cleanest for ATS; Serif and Classic add a more editorial feel.
        </p>
        <div className="mt-1 grid gap-2">
          {FONT_PAIRINGS.map((pairing) => {
            const isCurrent = pairingId === pairing.id;
            const inputId = `font-pairing-${pairing.id}`;

            return (
              <label
                key={pairing.id}
                htmlFor={inputId}
                className={cardClass(isCurrent)}
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
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className="font-medium"
                    style={{ fontFamily: pairing.heading }}
                  >
                    {pairing.label}
                  </span>
                  <span className="text-xs text-muted">
                    {pairing.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Density</legend>
        <p className="text-xs text-muted">
          Controls line height and the space between sections. Changing it
          re-measures the preview and the PDF.
        </p>
        <div className="mt-1 grid gap-2">
          {DENSITY_PRESETS.map((preset) => {
            const isCurrent = densityId === preset.id;
            const inputId = `density-${preset.id}`;

            return (
              <label
                key={preset.id}
                htmlFor={inputId}
                className={cardClass(isCurrent)}
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
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-xs text-muted">
                    {preset.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
