"use client";

import { useMemo } from "react";

import { buildAtsText } from "@/lib/ats/atsText";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

export function AtsTextView({ doc }: { doc: ResumeDocument }) {
  const text = useMemo(() => buildAtsText(doc), [doc]);

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs text-muted">
        Plain text in the order an ATS parser reads it. Formatting, columns, and
        skill ratings are ignored.
      </p>
      <pre
        aria-label="ATS plain text preview"
        className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-surface p-4 font-mono text-xs leading-relaxed text-text"
      >
        {text !== ""
          ? text
          : "Nothing to extract yet. Add your name and at least one section."}
      </pre>
    </div>
  );
}
