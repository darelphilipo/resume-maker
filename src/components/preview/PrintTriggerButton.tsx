"use client";

import { Info, Printer } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { printResume } from "@/lib/print/printDocument";

import { PrintPortal } from "./PrintPortal";

type PrintJob = {
  doc: ResumeDocument;
  pages: string[][];
};

export function PrintTriggerButton({
  doc,
  pages,
}: {
  doc: ResumeDocument;
  pages: string[][];
}) {
  const [job, setJob] = useState<PrintJob | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const startedJobRef = useRef<PrintJob | null>(null);
  const tipContainerRef = useRef<HTMLDivElement | null>(null);
  const tipId = useId();

  useEffect(() => {
    if (!job) {
      startedJobRef.current = null;
      return;
    }

    if (startedJobRef.current === job) {
      return;
    }

    startedJobRef.current = job;

    void printResume({
      pages: job.pages,
      name: job.doc.basics.name,
      headline: job.doc.basics.headline,
    }).finally(() => {
      if (startedJobRef.current !== job) {
        return;
      }

      startedJobRef.current = null;
      setJob(null);
    });
  }, [job]);

  useEffect(() => {
    if (!tipOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!tipContainerRef.current?.contains(event.target as Node)) {
        setTipOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [tipOpen]);

  return (
    <>
      <div
        ref={tipContainerRef}
        className="group relative flex items-center"
        onBlur={(event) => {
          const next = event.relatedTarget;

          if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
            setTipOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && tipOpen) {
            event.stopPropagation();
            setTipOpen(false);
          }
        }}
      >
        <button
          type="button"
          aria-label="Save PDF"
          aria-describedby={tipId}
          disabled={job !== null}
          onClick={() => {
            setJob((current) => current ?? { doc, pages });
          }}
          className="editor-chrome inline-flex min-h-11 min-w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-2 py-2 text-sm font-medium text-white transition-colors hover:border-primary/90 hover:bg-primary/90 active:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 sm:min-w-11 sm:px-3"
        >
          <Printer size={18} aria-hidden />
          <span className="hidden sm:inline">Save PDF</span>
        </button>

        <button
          type="button"
          aria-label="Print tips"
          aria-expanded={tipOpen}
          aria-controls={tipId}
          onClick={() => {
            setTipOpen((open) => !open);
          }}
          className="ml-0.5 hidden min-h-11 min-w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:inline-flex sm:min-w-11"
        >
          <Info size={16} aria-hidden />
        </button>

        <p
          id={tipId}
          role="tooltip"
          className={`${tipOpen ? "visible opacity-100" : "invisible opacity-0"} pointer-events-none absolute right-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3 text-left text-xs leading-snug text-text shadow-lg transition-opacity pointer-fine:group-hover:visible pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:visible pointer-fine:group-focus-within:opacity-100`}
        >
          Turn off “Headers and footers” in the print dialog so the page URL and
          date stay out of the PDF.
        </p>
      </div>

      {job ? <PrintPortal doc={job.doc} pages={job.pages} /> : null}
    </>
  );
}
