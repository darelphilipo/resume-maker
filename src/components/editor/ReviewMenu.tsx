"use client";

import {
  CaretDown,
  CornersIn,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  TextAlignLeft,
  X,
} from "@phosphor-icons/react";
import { useId, useState } from "react";

import { TrimTipsDialog } from "@/components/preview/TrimTipsDialog";
import { CenteredModal } from "@/components/shared/CenteredModal";
import type { BulletLintReport } from "@/lib/lint/bulletMetrics";
import { MAX_LISTED_ISSUES } from "@/lib/lint/bulletMetrics";
import { MIN_FIT_LABEL, fitBlockedCopy } from "@/lib/pagination/fitCopy";
import type { FitBlockedReason } from "@/lib/pagination/usePageLayout";

/**
 * The Preview toolbar keeps only two controls: the Visual/ATS switch and this
 * single **Review** pill. The rare review lenses (6s Scan, Anonymize) and the
 * occasional utilities (Trim tips, Fit to 1 Page, Reset fit) live in a centred
 * dialog instead of crowding the live resume. A small dot or count badge on the
 * pill shows that one of them is active or needs attention. Every control is
 * session-only: the saved document only changes through an explicit fit patch.
 */
export function ReviewMenu({
  scan,
  anonymize,
  onToggleScan,
  onToggleAnonymize,
  bulletReport = null,
  fitTarget = null,
  fitBlockedReason = null,
  appliedFitScale = 1,
  onFit,
  onResetFit,
}: {
  scan: boolean;
  anonymize: boolean;
  onToggleScan: () => void;
  onToggleAnonymize: () => void;
  bulletReport?: BulletLintReport | null;
  /** The computed scale that would fit the resume on one page, if any. */
  fitTarget?: number | null;
  fitBlockedReason?: FitBlockedReason | null;
  appliedFitScale?: number;
  onFit?: (scale: number) => void;
  onResetFit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const titleId = useId();
  const trimTitleId = useId();
  const active = scan || anonymize;
  const trimCount = bulletReport?.issues.length ?? 0;
  const hiddenTrimCount = Math.max(0, trimCount - MAX_LISTED_ISSUES);
  const canFit = fitTarget !== null && onFit !== undefined;
  const canResetFit = appliedFitScale < 1 && onResetFit !== undefined;
  const blockedCopy =
    fitBlockedReason && !canFit ? fitBlockedCopy(fitBlockedReason) : null;
  const hasUtilities =
    trimCount > 0 || canFit || canResetFit || blockedCopy !== null;

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
        {trimCount > 0 ? (
          <span
            data-review-trim-badge=""
            aria-hidden
            className="min-w-4 rounded-full bg-amber-100 px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-amber-900"
          >
            {trimCount}
          </span>
        ) : null}
        {active ? (
          <>
            <span
              data-review-active-dot=""
              aria-hidden
              className="h-2 w-2 rounded-full bg-primary"
            />
            <span className="sr-only">, active</span>
          </>
        ) : appliedFitScale < 1 ? (
          <>
            <span
              data-review-fit-dot=""
              aria-hidden
              className="h-2 w-2 rounded-full bg-amber-500"
            />
            <span className="sr-only">, fit is reduced</span>
          </>
        ) : null}
        {trimCount > 0 ? (
          <span className="sr-only">
            , {trimCount} {trimCount === 1 ? "trim tip" : "trim tips"}
          </span>
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
              Optional preview lenses and page helpers. Your saved resume never
              changes unless you fit it.
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

        {hasUtilities ? (
          <div
            data-review-utilities=""
            className="mt-3 space-y-2 border-t border-line pt-3"
          >
            {trimCount > 0 ? (
              <ReviewAction
                label={`Trim tips (${trimCount})`}
                description="Find bullets that quietly cost you a line."
                icon={<TextAlignLeft size={18} aria-hidden />}
                marker="data-review-trim"
                onClick={() => {
                  setOpen(false);
                  setTrimOpen(true);
                }}
              />
            ) : null}
            {canResetFit ? (
              <ReviewAction
                label="Reset fit"
                description="Return the resume to its full size."
                icon={<CornersIn size={18} aria-hidden />}
                marker="data-review-reset-fit"
                onClick={() => {
                  setOpen(false);
                  onResetFit?.();
                }}
              />
            ) : null}
            {canFit ? (
              <ReviewAction
                label="Fit to 1 Page"
                description="Shrink the resume to one readable page."
                icon={<CornersIn size={18} aria-hidden />}
                marker="data-review-fit"
                onClick={() => {
                  setOpen(false);
                  if (fitTarget !== null) {
                    onFit?.(fitTarget);
                  }
                }}
              />
            ) : null}
            {blockedCopy ? (
              <p
                data-review-fit-blocked=""
                title={blockedCopy}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900"
              >
                <span className="font-semibold">{MIN_FIT_LABEL}</span> ·{" "}
                {blockedCopy}
              </p>
            ) : null}
          </div>
        ) : null}
      </CenteredModal>

      {trimOpen && bulletReport && trimCount > 0 ? (
        <TrimTipsDialog
          report={bulletReport}
          titleId={trimTitleId}
          hiddenCount={hiddenTrimCount}
          onClose={() => {
            setTrimOpen(false);
          }}
        />
      ) : null}
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

function ReviewAction({
  label,
  description,
  icon,
  marker,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  marker: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      {...{ [marker]: "" }}
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text">{label}</span>
        <span className="block text-[11px] leading-snug text-muted">
          {description}
        </span>
      </span>
    </button>
  );
}
