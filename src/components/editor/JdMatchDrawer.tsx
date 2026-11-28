"use client";

import { Target, X } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";
import type { ButtonHTMLAttributes } from "react";

import { CenteredModal } from "@/components/shared/CenteredModal";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { buildAtsText } from "@/lib/ats/atsText";
import { matchJobKeywords } from "@/lib/keywords/jdMatch";
import { useIsDesktop } from "@/lib/responsive/useIsDesktop";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

import { EntryDrawer } from "./EntryDrawer";
import { CONTENT_HEADER_ACTION_CLASS } from "./contentHeaderAction";

type MatchResult = ReturnType<typeof matchJobKeywords>;

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

const DESCRIPTION =
  "Paste a job description to compare its keywords with your resume. Everything stays in your browser.";

function JdMatchBody({
  jobDescription,
  onJobDescriptionChange,
  result,
}: {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  result: MatchResult;
}) {
  const total = result.matched.length + result.missing.length;
  const percent = Math.round(result.coverage * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="jd-match-textarea" className="text-sm font-medium">
          Job description
        </label>
        <textarea
          id="jd-match-textarea"
          value={jobDescription}
          onChange={(event) => {
            onJobDescriptionChange(event.currentTarget.value);
          }}
          rows={6}
          placeholder="Paste the job posting here…"
          className="min-h-32 w-full resize-y rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {total === 0 ? (
          <p className="text-sm opacity-70">
            No keywords yet. Paste a job description and we will compare it with
            the text an ATS reads from your resume.
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
              Keywords are extracted with simple word heuristics. Use them as a
              prompt, not a score.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

type TriggerExtra = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-haspopup" | "aria-expanded" | "aria-controls"
>;

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
  const isDesktop = useIsDesktop();
  const modalTitleId = useId();
  const resumeText = useMemo(() => buildAtsText(doc), [doc]);
  const result = useMemo(
    () => matchJobKeywords(jobDescription, resumeText),
    [jobDescription, resumeText],
  );

  // vaul's Trigger already toggles the controlled Root through Radix. Committing
  // the open state explicitly as well is harmless (both paths set `true`) and
  // guarantees the portal mounts even if that composed click handler is lost —
  // e.g. a ref-forwarding change under React 19. Native button activation means
  // Space and Enter both go through this same click path.
  function openDrawer() {
    setOpen(true);
    trackEvent("tool_match_jd");
  }

  // Both triggers keep the same accessible name and visual treatment; only the
  // dialog primitive changes with the viewport. On phones the non-snapped Vaul
  // sheet opens from the bottom; on desktop a centred modal guarantees that a
  // single tap on X closes outright, with no snap point to collapse back to.
  function renderTrigger(extra?: TriggerExtra) {
    return compact ? (
      <button
        type="button"
        aria-label="Match to a job description"
        onClick={openDrawer}
        {...extra}
        className={`${CONTENT_HEADER_ACTION_CLASS} text-muted hover:text-text`}
      >
        <Target size={16} aria-hidden />
        <span>Match JD</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={openDrawer}
        {...extra}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Target size={18} aria-hidden />
        Match to a job description
      </button>
    );
  }

  const body = (
    <JdMatchBody
      jobDescription={jobDescription}
      onJobDescriptionChange={setJobDescription}
      result={result}
    />
  );

  if (isDesktop) {
    return (
      <>
        {renderTrigger({
          "aria-haspopup": "dialog",
          "aria-expanded": open,
          "aria-controls": open ? modalTitleId : undefined,
        })}
        <CenteredModal
          open={open}
          onClose={() => {
            setOpen(false);
          }}
          titleId={modalTitleId}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              id={modalTitleId}
              className="min-w-0 flex-1 font-serif text-lg font-semibold tracking-tight"
            >
              Job description keywords
            </h2>
            <button
              type="button"
              aria-label="Close drawer"
              onClick={() => {
                setOpen(false);
              }}
              className="-mr-1 -mt-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">{DESCRIPTION}</p>
          <div className="mt-4">{body}</div>
        </CenteredModal>
      </>
    );
  }

  return (
    <EntryDrawer
      open={open}
      onOpenChange={setOpen}
      title="Job description keywords"
      description={DESCRIPTION}
      trigger={renderTrigger()}
      snapPoints={false}
    >
      {body}
    </EntryDrawer>
  );
}
