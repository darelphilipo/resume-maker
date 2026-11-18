"use client";

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

export function DesignPanel() {
  const format = useResumeStore((state) => state.doc.metadata.page.format);
  const templateId = useResumeStore((state) => state.doc.metadata.template);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const currentTemplate = getTemplate(templateId);

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
                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                  isCurrent
                    ? "border-primary/40 bg-primary/5"
                    : "border-line hover:border-black/30"
                }`}
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
                className={`flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                  isCurrent
                    ? "border-primary/40 bg-primary/5"
                    : "border-line hover:border-black/30"
                }`}
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
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{template.label}</span>
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
    </div>
  );
}
