"use client";

import { CaretDown, Eye, EyeSlash, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useId, useState } from "react";

import { CenteredModal } from "@/components/shared/CenteredModal";

/**
 * The Preview toolbar keeps only two controls: the Visual/ATS switch and this
 * single **Review** pill. The rare review lenses live in a centred dialog
 * instead of crowding the live resume; a small dot on the pill shows that one
 * of them is active. Both toggles are session-only and never touch the saved
 * document (the same contract they had as standalone toolbar pills).
 */
export function ReviewMenu({
  scan,
  anonymize,
  onToggleScan,
  onToggleAnonymize,
}: {
  scan: boolean;
  anonymize: boolean;
  onToggleScan: () => void;
  onToggleAnonymize: () => void;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const active = scan || anonymize;

  return (
    <>
      <button
        type="button"
        data-review-toggle=""
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        onClick={() => {
          setOpen((current) => !current);
        }}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-xs font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary/5 aria-expanded:border-primary/40 aria-expanded:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Review
        {active ? (
          <>
            <span
              data-review-active-dot=""
              aria-hidden
              className="h-2 w-2 rounded-full bg-primary"
            />
            <span className="sr-only">, active</span>
          </>
        ) : null}
        <CaretDown
          size={12}
          aria-hidden
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <CenteredModal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        titleId={titleId}
        contentClassName="max-w-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold">
              Review tools
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              Optional preview lenses. Your saved resume never changes.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close review tools"
            onClick={() => {
              setOpen(false);
            }}
            className="-mr-1 -mt-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <ReviewSwitch
            label="6s Scan"
            description="Dim body prose; keep names, titles, dates, and numbers at full contrast."
            icon={<MagnifyingGlass size={18} aria-hidden />}
            checked={scan}
            marker="data-review-scan"
            onChange={onToggleScan}
          />
          <ReviewSwitch
            label="Anonymize"
            description="Replace personal details with placeholders in the preview and PDF."
            icon={
              anonymize ? (
                <EyeSlash size={18} aria-hidden />
              ) : (
                <Eye size={18} aria-hidden />
              )
            }
            checked={anonymize}
            marker="data-review-anonymize"
            onChange={onToggleAnonymize}
          />
        </div>

        {anonymize ? (
          <p
            data-review-mode-note=""
            role="status"
            className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-snug text-primary"
          >
            Review mode is on. Personal details are replaced in the preview and
            PDF; your saved resume is unchanged.
          </p>
        ) : null}
      </CenteredModal>
    </>
  );
}

function ReviewSwitch({
  label,
  description,
  icon,
  checked,
  marker,
  onChange,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  marker: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      {...{ [marker]: "" }}
      onClick={onChange}
      className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text">{label}</span>
        <span className="block text-[11px] leading-snug text-muted">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-black/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
