"use client";

import { Target } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { buildAtsText } from "@/lib/ats/atsText";
import { matchJobKeywords } from "@/lib/keywords/jdMatch";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

import { EntryDrawer } from "./EntryDrawer";

type KeywordChipsProps = {
  label: string;
  keywords: readonly string[];
  tone: "matched" | "missing";
};

function KeywordChips({ label, keywords, tone }: KeywordChipsProps) {
  const chipClass =
    tone === "matched"
      ? "border-emerald-700/20 bg-emerald-50 text-emerald-900"
      : "border-amber-700/20 bg-amber-50 text-amber-900";

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide opacity-60">
        {label}
      </h3>
      {keywords.length > 0 ? (
        <ul aria-label={label} className="flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <li
              key={keyword}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${chipClass}`}
            >
              {keyword}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-60">
          {tone === "matched"
            ? "No job keywords found in your resume yet."
            : "Nothing missing from this job description."}
        </p>
      )}
    </section>
  );
}

export function JdMatchDrawer({
  doc,
  compact = false,
}: {
  doc: ResumeDocument;
  /** Compact trigger for a panel header; the full-width variant is the default. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const resumeText = useMemo(() => buildAtsText(doc), [doc]);
  const result = useMemo(
    () => matchJobKeywords(jobDescription, resumeText),
    [jobDescription, resumeText],
  );
  const total = result.matched.length + result.missing.length;
  const percent = Math.round(result.coverage * 100);

  // vaul's Trigger already toggles the controlled Root through Radix. Committing
  // the open state explicitly as well is harmless (both paths set `true`) and
  // guarantees the portal mounts even if that composed click handler is lost —
  // e.g. a ref-forwarding change under React 19. Native button activation means
  // Space and Enter both go through this same click path.
  function openDrawer() {
    setOpen(true);
  }

  // Both triggers keep the same accessible name and vaul ARIA wiring; only the
  // visual treatment changes so the header trigger stays compact on phones.
  const trigger = compact ? (
    <button
      type="button"
      aria-label="Match to a job description"
      onClick={openDrawer}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-xs font-semibold text-primary transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Target size={16} aria-hidden />
      <span>Match JD</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={openDrawer}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Target size={18} aria-hidden />
      Match to a job description
    </button>
  );

  return (
    <EntryDrawer
      open={open}
      onOpenChange={setOpen}
      title="Job description keywords"
      description="Paste a job description to compare its keywords with your resume. Everything stays in your browser."
      trigger={trigger}
      snapPoints={false}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="jd-match-textarea" className="text-sm font-medium">
            Job description
          </label>
          <textarea
            id="jd-match-textarea"
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.currentTarget.value);
            }}
            rows={6}
            placeholder="Paste the job posting here…"
            className="min-h-32 w-full resize-y rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>

        <div aria-live="polite" className="flex flex-col gap-4">
          {total === 0 ? (
            <p className="text-sm opacity-70">
              No keywords yet. Paste a job description and we will compare it
              with the text an ATS reads from your resume.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  {result.matched.length} of {total} keywords matched ({percent}%)
                </p>
                <div
                  aria-hidden
                  className="h-2 overflow-hidden rounded-full bg-black/10"
                >
                  <div
                    className="h-full rounded-full bg-emerald-600"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
              <KeywordChips
                label="Matched"
                keywords={result.matched}
                tone="matched"
              />
              <KeywordChips
                label="Missing"
                keywords={result.missing}
                tone="missing"
              />
              <p className="text-xs opacity-60">
                Keywords are extracted with simple word heuristics. Use them
                as a prompt, not a score.
              </p>
            </>
          )}
        </div>
      </div>
    </EntryDrawer>
  );
}
