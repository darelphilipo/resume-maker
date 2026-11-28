"use client";

import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";

import { CenteredModal } from "@/components/shared/CenteredModal";
import { trackEvent } from "@/lib/analytics/trackEvent";
import {
  analyzeResumeLint,
  standardizeBulletPeriods,
  type BulletPeriodStyle,
  type ResumeLintEntryTarget,
  type ResumeLintFinding,
} from "@/lib/lint/resumeLint";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

import { CONTENT_HEADER_ACTION_CLASS } from "./contentHeaderAction";

const PERIOD_ACTION_CLASS =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 pointer-coarse:min-h-11";

const CARD_CLASS = "rounded-lg border border-line bg-surface px-3 py-2";

/**
 * The quiet `Tidy` check in the Content header.
 *
 * The trigger stays a compact pill beside `Match JD` (with a small count badge
 * instead of a parenthesised suffix) so all three labels share one nowrap row
 * at 390px. The centred modal groups findings into bordered cards, puts the
 * period fixes inside the card they address, and offers jump-to-entry links
 * instead of long walls of quoted text. The only automatic edit goes through
 * `setDoc`, so it is one undoable change in the existing Zundo history.
 */
export function ResumeLintPopover({
  doc,
  onJumpToEntry,
}: {
  doc: ResumeDocument;
  /** Reveal the offending entry in the Content tab from a card's jump link. */
  onJumpToEntry?: (target: ResumeLintEntryTarget) => void;
}) {
  const setDoc = useResumeStore((state) => state.setDoc);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const panelId = useId();
  const report = useMemo(() => analyzeResumeLint(doc), [doc]);
  const issueCount = report.issueCount;
  const verbFindings = report.findings.filter(
    (finding) => finding.id === "repeated-verbs",
  );
  const hasMixedPeriods = report.findings.some(
    (finding) => finding.id === "mixed-periods",
  );

  function applyPeriods(style: BulletPeriodStyle): void {
    setDoc(standardizeBulletPeriods(doc, style));
    setAnnouncement(
      style === "add"
        ? "Added periods to bullets. Undo with Ctrl+Z if needed."
        : "Removed trailing periods. Undo with Ctrl+Z if needed.",
    );
  }

  function jumpTo(finding: ResumeLintFinding): void {
    if (!finding.target || !onJumpToEntry) {
      return;
    }

    setOpen(false);
    onJumpToEntry(finding.target);
  }

  function periodActions() {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            applyPeriods("remove");
          }}
          disabled={report.periods.withPeriod === 0}
          className={PERIOD_ACTION_CLASS}
        >
          Remove periods
        </button>
        <button
          type="button"
          onClick={() => {
            applyPeriods("add");
          }}
          disabled={report.periods.withoutPeriod === 0}
          className={PERIOD_ACTION_CLASS}
        >
          Add periods
        </button>
      </div>
    );
  }

  function findingCard(finding: ResumeLintFinding) {
    return (
      <li key={finding.id} data-lint-card={finding.id} className={CARD_CLASS}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-text">{finding.title}</p>
          <span className="shrink-0 rounded-full bg-black/5 px-1.5 text-[10px] font-semibold text-muted">
            {finding.count}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted">
          {finding.detail}
        </p>
        {finding.id === "mixed-periods" ? periodActions() : null}
        {finding.id !== "mixed-periods" && finding.snippets.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {finding.snippets.slice(0, 2).map((snippet, index) => (
              <li
                key={`${snippet}-${index}`}
                className="max-w-full break-words text-[11px] leading-snug text-text/80"
              >
                “{snippet}”
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        data-resume-lint-trigger=""
        aria-label={
          issueCount === 0
            ? "Tidy: no issues"
            : `Tidy: ${issueCount} ${issueCount === 1 ? "issue" : "issues"}`
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          trackEvent("tool_tidy");
          setOpen((current) => !current);
        }}
        className={`${CONTENT_HEADER_ACTION_CLASS} ${
          issueCount === 0
            ? "text-muted hover:text-text"
            : "text-amber-800 hover:text-amber-900"
        }`}
      >
        {issueCount === 0 ? (
          <CheckCircle size={14} aria-hidden />
        ) : (
          <WarningCircle size={14} aria-hidden />
        )}
        <span>Tidy</span>
        {issueCount > 0 ? (
          <span
            data-lint-count=""
            aria-hidden="true"
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-semibold leading-none text-amber-900"
          >
            {issueCount}
          </span>
        ) : null}
      </button>

      <CenteredModal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        titleId={panelId}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={panelId} className="font-serif text-sm font-semibold">
            Tidy bullets
          </h2>
          <button
            type="button"
            aria-label="Close tidy bullets"
            onClick={() => {
              setOpen(false);
            }}
            className="-mr-1 -mt-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          Quick local checks to tidy your bullets.
        </p>

        {report.findings.length === 0 ? (
          <p
            role="status"
            className="mt-2 flex items-start gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] font-medium text-emerald-900"
          >
            <CheckCircle size={14} aria-hidden className="mt-0.5 shrink-0" />
            <span>No bullet issues found.</span>
          </p>
        ) : null}

        <ul aria-label="Tidy findings" className="mt-2 space-y-2">
          {report.findings
            .filter((finding) => finding.id !== "repeated-verbs")
            .map(findingCard)}
          {verbFindings.length > 0 ? (
            <li data-lint-card="repeated-verbs" className={CARD_CLASS}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-text">
                  Repeated opening verbs
                </p>
                <span className="shrink-0 rounded-full bg-black/5 px-1.5 text-[10px] font-semibold text-muted">
                  {verbFindings.length}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                Vary the first word inside each role so bullets do not read alike.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {verbFindings.map((finding, index) => (
                  <li key={`${finding.title}-${index}`}>
                    {finding.target && onJumpToEntry ? (
                      <button
                        type="button"
                        aria-label={`Jump to entry for repeated “${finding.verb}” bullets`}
                        title="Jump to entry"
                        onClick={() => {
                          jumpTo(finding);
                        }}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-line bg-surface-muted px-2 text-[11px] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {finding.verb} ×{finding.count}
                        <span aria-hidden="true" className="text-muted">
                          ›
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-surface-muted px-2 text-[11px] font-medium text-primary">
                        {finding.verb} ×{finding.count}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
          {!hasMixedPeriods ? (
            <li data-lint-card="bullet-periods" className={CARD_CLASS}>
              <p className="text-xs font-semibold text-text">Bullet periods</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">
                {report.bulletCount === 0
                  ? "Add a bullet to a section first."
                  : `${report.periods.withPeriod} with a period · ${report.periods.withoutPeriod} without. Other endings stay as they are.`}
              </p>
              {report.bulletCount > 0 ? periodActions() : null}
            </li>
          ) : null}
        </ul>

        {announcement !== "" ? (
          <p
            role="status"
            className="mt-2 text-[11px] leading-snug text-emerald-800"
          >
            {announcement}
          </p>
        ) : null}
      </CenteredModal>
    </div>
  );
}
