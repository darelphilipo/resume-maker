"use client";

import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";

import { CenteredModal } from "@/components/shared/CenteredModal";
import {
  analyzeResumeLint,
  standardizeBulletPeriods,
  type BulletPeriodStyle,
} from "@/lib/lint/resumeLint";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { useResumeStore } from "@/lib/store/useResumeStore";

const PERIOD_ACTION_CLASS =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:border-black/30 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 pointer-coarse:min-h-11";

/**
 * A compact, zero-AI bullet check for the Content header.
 *
 * The trigger is a quiet text button, not a second primary CTA: the badge stays
 * muted when the bullets are clean and turns amber when any deterministic check
 * fires. The panel is a centred modal portalled to `document.body`, so it is
 * never clipped by the narrow left Content column at any viewport width (an
 * `absolute right-0` popover there extended past the left edge on desktop).
 * The modal lists plain-language findings and offers the only automatic edit:
 * standardizing trailing periods. That edit goes through `setDoc`, so it is one
 * undoable change in the existing Zundo history and autosaves like any edit.
 */
export function ResumeLintPopover({ doc }: { doc: ResumeDocument }) {
  const setDoc = useResumeStore((state) => state.setDoc);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const panelId = useId();
  const report = useMemo(() => analyzeResumeLint(doc), [doc]);
  const issueCount = report.issueCount;

  function applyPeriods(style: BulletPeriodStyle): void {
    setDoc(standardizeBulletPeriods(doc, style));
    setAnnouncement(
      style === "add"
        ? "Added periods to bullets. Undo with Ctrl+Z if needed."
        : "Removed trailing periods. Undo with Ctrl+Z if needed.",
    );
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        data-resume-lint-trigger=""
        aria-label={
          issueCount === 0
            ? "Bullet polish: no issues"
            : `Bullet polish: ${issueCount} ${
                issueCount === 1 ? "issue" : "issues"
              }`
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current);
        }}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          issueCount === 0
            ? "text-muted hover:bg-black/5 hover:text-text"
            : "text-amber-800 hover:bg-amber-50 hover:text-amber-900"
        }`}
      >
        {issueCount === 0 ? (
          <CheckCircle size={16} aria-hidden />
        ) : (
          <WarningCircle size={16} aria-hidden />
        )}
        <span>
          Bullet polish
          {issueCount > 0 ? ` (${issueCount})` : ""}
        </span>
      </button>

      <CenteredModal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        titleId={panelId}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id={panelId} className="text-sm font-semibold">
            Bullet polish
          </h2>
          <button
            type="button"
            aria-label="Close bullet polish"
            onClick={() => {
              setOpen(false);
            }}
            className="-mr-1 -mt-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted">
          A deterministic check of the bullets in your visible sections. No AI,
          no network, no changes until you tap a fix.
        </p>

        {report.findings.length === 0 ? (
          <p
            role="status"
            className="mt-2 flex items-start gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] font-medium text-emerald-900"
          >
            <CheckCircle size={14} aria-hidden className="mt-0.5 shrink-0" />
            <span>No bullet issues found.</span>
          </p>
        ) : (
          <ul aria-label="Bullet polish findings" className="mt-2 space-y-2.5">
            {report.findings.map((finding, index) => (
              <li key={`${finding.id}-${index}`}>
                <p className="font-semibold text-text">{finding.title}</p>
                <p className="text-[11px] leading-snug text-muted">
                  {finding.detail}
                </p>
                {finding.snippets.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {finding.snippets.map((snippet, snippetIndex) => (
                      <li
                        key={`${snippet}-${snippetIndex}`}
                        className="break-words text-[11px] leading-snug text-text/80"
                      >
                        “{snippet}”
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 border-t border-line/70 pt-2">
          <p className="text-xs font-semibold">Standardize bullet periods</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">
            {report.bulletCount === 0
              ? "Add a bullet to a section first."
              : `${report.periods.withPeriod} with a period · ${report.periods.withoutPeriod} without. Other endings stay as they are.`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                applyPeriods("remove");
              }}
              disabled={report.periods.withPeriod === 0}
              className={PERIOD_ACTION_CLASS}
            >
              Remove all trailing periods
            </button>
            <button
              type="button"
              onClick={() => {
                applyPeriods("add");
              }}
              disabled={report.periods.withoutPeriod === 0}
              className={PERIOD_ACTION_CLASS}
            >
              Add periods to all bullets
            </button>
          </div>
          {announcement !== "" ? (
            <p
              role="status"
              className="mt-1.5 text-[11px] leading-snug text-emerald-800"
            >
              {announcement}
            </p>
          ) : null}
        </div>
      </CenteredModal>
    </div>
  );
}
