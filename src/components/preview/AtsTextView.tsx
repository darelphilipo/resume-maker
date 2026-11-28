"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics/trackEvent";
import {
  buildAtsCopyBlocks,
  type AtsCopyEntry,
  type AtsCopySection,
} from "@/lib/ats/atsText";
import { copyText } from "@/lib/clipboard/copyText";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

const COPIED_STATE_MS = 1500;

type CopiedState = { key: string; label: string } | null;

const COMPACT_BUTTON_CLASS =
  "inline-flex min-h-9 min-w-[5.5rem] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:min-h-11 pointer-coarse:min-w-11";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-[11.5rem] shrink-0 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

interface CopyButtonProps {
  ariaLabel: string;
  copied: boolean;
  disabled?: boolean;
  label: string;
  onCopy: () => void;
  variant?: "compact" | "primary";
}

function CopyButton({
  ariaLabel,
  copied,
  disabled = false,
  label,
  onCopy,
  variant = "compact",
}: CopyButtonProps) {
  const primary = variant === "primary";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onCopy}
      className={primary ? PRIMARY_BUTTON_CLASS : COMPACT_BUTTON_CLASS}
    >
      {copied ? (
        <Check size={primary ? 16 : 14} aria-hidden />
      ) : (
        <Copy size={primary ? 16 : 14} aria-hidden />
      )}
      <span className={primary ? undefined : "hidden sm:inline"}>
        {copied ? "Copied" : label}
      </span>
    </button>
  );
}

/**
 * A single-block Summary shows one prose block under its SUMMARY heading, so
 * its per-entry Copy only repeats the section button (with or without the
 * heading) and visibly stacks under it. Keep the section button as the single
 * control. Other sections keep per-entry Copy because their entries copy
 * genuinely different text.
 */
export function shouldHideEntryCopy(section: AtsCopySection): boolean {
  if (section.id === "summary") {
    return section.entries.length === 1;
  }

  return (
    section.entries.length === 1 && section.entries[0].text === section.text
  );
}

export function AtsTextView({ doc }: { doc: ResumeDocument }) {
  const blocks = useMemo(() => buildAtsCopyBlocks(doc), [doc]);
  const header = blocks.header;
  const [copied, setCopied] = useState<CopiedState>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(
    async (key: string, label: string, text: string) => {
      const didCopy = await copyText(text);

      if (!didCopy) {
        return;
      }

      setCopied({ key, label });

      const kind =
        key === "all" || key === "header"
          ? key
          : key.includes(":")
            ? "entry"
            : "section";
      trackEvent("ats_copy", kind);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        setCopied(null);
      }, COPIED_STATE_MS);
    },
    [],
  );

  function copiedEntry(section: AtsCopySection, entry: AtsCopyEntry): boolean {
    return copied?.key === `${section.id}:${entry.id}`;
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="px-1 text-xs leading-relaxed text-muted">
          Plain text in the order an ATS parser reads it. Paste it into Workday,
          Greenhouse, or Lever. Formatting, columns, and skill ratings are
          ignored.
        </p>
        <CopyButton
          ariaLabel="Copy all plain text"
          copied={copied?.key === "all"}
          disabled={blocks.text === ""}
          label="Copy all plain text"
          onCopy={() => {
            void handleCopy("all", "all plain text", blocks.text);
          }}
          variant="primary"
        />
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {copied ? `Copied ${copied.label}.` : ""}
      </span>

      <div
        aria-label="ATS plain text preview"
        className="overflow-hidden rounded-xl border border-line bg-surface"
      >
        {blocks.text === "" ? (
          <p className="p-4 font-mono text-xs leading-relaxed text-text">
            Nothing to extract yet. Add your name and at least one section.
          </p>
        ) : (
          <>
            {header ? (
              <section
                data-ats-section="header"
                className="border-b border-line"
              >
                <div className="flex items-center justify-between gap-2 bg-surface-muted px-3 py-2">
                  <h3 className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Contact details
                  </h3>
                  <CopyButton
                    ariaLabel="Copy contact details"
                    copied={copied?.key === "header"}
                    label="Copy"
                    onCopy={() => {
                      void handleCopy("header", "contact details", header.text);
                    }}
                  />
                </div>
                <pre className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-relaxed text-text">
                  {header.text}
                </pre>
              </section>
            ) : null}

            {blocks.sections.map((section) => {
              const hideEntryCopy = shouldHideEntryCopy(section);

              return (
                <section
                  key={section.id}
                  data-ats-section={section.id}
                  className="border-b border-line last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2 bg-surface-muted px-3 py-2">
                    <h3 className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {section.title}
                    </h3>
                    <CopyButton
                      ariaLabel={`Copy ${section.title} section`}
                      copied={copied?.key === section.id}
                      label="Copy"
                      onCopy={() => {
                        void handleCopy(section.id, `${section.title} section`, section.text);
                      }}
                    />
                  </div>

                  <div className="divide-y divide-line/60">
                    {section.entries.map((entry, index) => (
                      <div
                        key={`${entry.id}:${index}`}
                        className="flex items-start gap-2 px-3 py-2"
                      >
                        <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-text">
                          {entry.text}
                        </pre>
                        {hideEntryCopy ? null : (
                          <CopyButton
                            ariaLabel={`Copy ${entry.label || section.title}`}
                            copied={copiedEntry(section, entry)}
                            label="Copy"
                            onCopy={() => {
                              void handleCopy(
                                `${section.id}:${entry.id}`,
                                entry.label || section.title,
                                entry.text,
                              );
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
