"use client";

import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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
 * A compact, zero-AI resume check for the Content header.
 *
 * The badge stays quiet when the bullets are clean and turns into a warning
 * count when any deterministic check fires. The popover lists plain-language
 * findings and offers the only automatic edit in this feature: standardizing
 * trailing periods. That edit goes through `setDoc`, so it is one undoable
 * change in the existing Zundo history and autosaves like any other edit.
 */
export function ResumeLintPopover({ doc }: { doc: ResumeDocument }) {
  const setDoc = useResumeStore((state) => state.setDoc);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const report = useMemo(() => analyzeResumeLint(doc), [doc]);
  const issueCount = report.issueCount;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function applyPeriods(style: BulletPeriodStyle): void {
    setDoc(standardizeBulletPeriods(doc, style));
    setAnnouncement(
      style === "add"
        ? "Added periods to bullets. Undo with Ctrl+Z if needed."
        : "Removed trailing periods. Undo with Ctrl+Z if needed.",
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex items-center"
      onBlur={(event) => {
        const next = event.relatedTarget;

        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        data-resume-lint-trigger=""
        aria-label={
          issueCount === 0
            ? "Resume check: no issues"
            : `Resume check: ${issueCount} ${
                issueCount === 1 ? "issue" : "issues"
              }`
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current);
        }}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          issueCount === 0
            ? "border-line bg-surface text-primary hover:border-black/30 hover:bg-black/5"
            : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
        }`}
      >
        {issueCount === 0 ? (
          <CheckCircle size={16} aria-hidden />
        ) : (
          <WarningCircle size={16} aria-hidden />
        )}
        <span>
          Check
          {issueCount > 0 ? ` (${issueCount})` : ""}
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-label="Resume check"
        hidden={!open}
        className="absolute right-0 top-full z-30 mt-1 max-h-[70vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-line bg-surface p-3 text-left text-xs text-text shadow-lg"
      >
        <p className="text-[11px] leading-snug text-muted">
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
          <ul aria-label="Resume check findings" className="mt-2 space-y-2.5">
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
      </div>
    </div>
  );
}
