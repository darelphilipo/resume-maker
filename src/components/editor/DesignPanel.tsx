"use client";

import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

type PageFormat = ResumeDocument["metadata"]["page"]["format"];

const PAGE_FORMATS: readonly { id: PageFormat; label: string; detail: string }[] =
  [
    { id: "a4", label: "A4", detail: "210 × 297 mm" },
    { id: "letter", label: "Letter", detail: "8.5 × 11 in" },
  ];

export function DesignPanel() {
  const format = useResumeStore((state) => state.doc.metadata.page.format);
  const patchDoc = useResumeStore((state) => state.patchDoc);

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Paper size</legend>
        <p className="text-xs opacity-60">
          The preview and printed PDF use this page size.
        </p>
        <div className="mt-1 grid gap-2">
          {PAGE_FORMATS.map((pageFormat) => {
            const isCurrent = format === pageFormat.id;

            return (
              <label
                key={pageFormat.id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${
                  isCurrent
                    ? "border-primary/40 bg-black/5"
                    : "border-black/10 hover:border-black/30"
                }`}
              >
                <input
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
                  <span className="text-xs opacity-60">{pageFormat.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section
        aria-labelledby="current-template-heading"
        className="flex flex-col gap-2 rounded-xl border border-black/10 p-4"
      >
        <h3
          id="current-template-heading"
          className="text-sm font-medium"
        >
          Template
        </h3>
        <div className="flex items-center justify-between gap-3">
          <span className="font-serif text-lg font-semibold">Onyx</span>
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium opacity-70">
            Current
          </span>
        </div>
        <p className="text-xs opacity-60">
          More templates and design controls arrive in the templates update.
        </p>
      </section>
    </div>
  );
}
