"use client";

import { Printer } from "@phosphor-icons/react";
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
  const startedJobRef = useRef<PrintJob | null>(null);
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

  return (
    <>
      <div className="flex flex-col items-end gap-0.5">
        <button
          type="button"
          aria-label="Save PDF"
          aria-describedby={tipId}
          disabled={job !== null}
          onClick={() => {
            setJob((current) => current ?? { doc, pages });
          }}
          className="editor-chrome inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <Printer size={18} aria-hidden />
          <span className="hidden sm:inline">Save PDF</span>
        </button>

        <p
          id={tipId}
          className="hidden max-w-[17rem] text-right text-[11px] leading-tight opacity-60 pointer-coarse:block"
        >
          Turn off “Headers and footers” in the print dialog.
        </p>
      </div>

      {job ? <PrintPortal doc={job.doc} pages={job.pages} /> : null}
    </>
  );
}
