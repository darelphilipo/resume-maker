"use client";

import {
  ArrowRight,
  BoxArrowDown,
  CaretDown,
  ClipboardText,
  FileText,
  UploadSimple,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import { PDF_IMPORT_ENABLED } from "@/lib/features";
import { parsePastedResume } from "@/lib/import/pasteResume";
import { ARCHETYPES, type Archetype } from "@/lib/presets/archetypes";
import { sanitizeResumeDocument } from "@/lib/richtext/sanitize";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { parseResumeJson } from "@/lib/schema/serialize";
import { useResumeStore } from "@/lib/store/useResumeStore";

const INVALID_FILE_MESSAGE =
  "That file is not a valid resume backup. Check the JSON and try again.";
const PASTE_ERROR_MESSAGE =
  "That text did not look like a resume. Include your name or at least one role, school, or skill and try again.";
const PDF_READ_ERROR_MESSAGE =
  "Could not read that PDF. Try another file, or paste the text instead.";
const PDF_NO_TEXT_MESSAGE =
  "That PDF has no selectable text. If it is a scan or an image, paste the text instead.";
const CREATE_RESUME_MESSAGE =
  "Could not create the resume. Your browser may be blocking local storage.";
const TRUST_POINTS = [
  "100% Free",
  "No Sign-Up",
  "Works Offline in Your Browser",
] as const;

export function Launcher() {
  const router = useRouter();
  const [pastedText, setPastedText] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handlePdfChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setPdfFileName(file.name);
    setPdfError(null);
    setIsReadingPdf(true);

    let doc: ResumeDocument;

    try {
      const { parsePdfResume } = await import("@/lib/import/pdfResume");
      const result = await parsePdfResume(await file.arrayBuffer());

      if (result.text.trim() === "") {
        setPdfError(PDF_NO_TEXT_MESSAGE);
        return;
      }

      if (!result.doc) {
        setPdfError(PASTE_ERROR_MESSAGE);
        return;
      }

      doc = result.doc;
    } catch {
      setPdfError(PDF_READ_ERROR_MESSAGE);
      return;
    } finally {
      setIsReadingPdf(false);
      input.value = "";
    }

    try {
      const safeDoc = sanitizeResumeDocument(doc);
      const id = await useResumeStore.getState().importResume(safeDoc);
      router.push(`/editor?id=${id}`);
    } catch {
      setPdfError(CREATE_RESUME_MESSAGE);
    }
  }

  async function handleBackupChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setBackupFileName(file.name);
    setBackupError(null);
    setIsRestoring(true);

    try {
      const parsed = parseResumeJson(await file.text());

      if (!parsed.ok) {
        setBackupError(INVALID_FILE_MESSAGE);
        return;
      }

      try {
        const safeDoc = sanitizeResumeDocument(parsed.doc);
        const id = await useResumeStore.getState().importResume(safeDoc);
        router.push(`/editor?id=${id}`);
      } catch {
        setBackupError(CREATE_RESUME_MESSAGE);
      }
    } catch {
      setBackupError(INVALID_FILE_MESSAGE);
    } finally {
      setIsRestoring(false);
      input.value = "";
    }
  }

  async function handlePasteImport() {
    if (pastedText.trim() === "" || isPasting) {
      return;
    }

    setIsPasting(true);
    setPasteError(null);

    try {
      const doc = parsePastedResume(pastedText);

      if (!doc) {
        setPasteError(PASTE_ERROR_MESSAGE);
        return;
      }

      const safeDoc = sanitizeResumeDocument(doc);
      const id = await useResumeStore.getState().importResume(safeDoc);
      router.push(`/editor?id=${id}`);
    } catch {
      setPasteError(CREATE_RESUME_MESSAGE);
    } finally {
      setIsPasting(false);
    }
  }

  async function handleArchetype(archetype: Archetype) {
    if (creatingId) {
      return;
    }

    setCreatingId(archetype.id);
    setCreateError(null);

    try {
      const id = await useResumeStore.getState().createResume("onyx");
      useResumeStore.getState().setDoc(archetype.build());
      await useResumeStore.getState().saveNow();
      router.push(`/editor?id=${id}`);
    } catch {
      setCreateError(CREATE_RESUME_MESSAGE);
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ul
        aria-label="Resume Maker promises"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-medium sm:text-sm"
      >
        {TRUST_POINTS.map((point, index) => (
          <li key={point} className="flex items-center gap-2">
            {index > 0 ? (
              <span aria-hidden className="opacity-40">
                ·
              </span>
            ) : null}
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="launcher-paste-heading"
        className="rounded-2xl border border-black/10 bg-background p-6"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="launcher-paste-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Paste your resume
          </h2>
          <p className="text-sm opacity-70">
            Copy the text from a PDF, LinkedIn profile, or another tool. The
            usual headings, dates, and bullet lists are turned into editable
            sections.
          </p>
        </div>

        <label
          htmlFor="resume-paste-input"
          className="mt-5 block text-sm font-medium"
        >
          Resume text
        </label>
        <textarea
          id="resume-paste-input"
          value={pastedText}
          onChange={(event) => {
            setPastedText(event.currentTarget.value);
            setPasteError(null);
          }}
          rows={8}
          placeholder="Paste your resume here. Headings such as Experience, Education, and Skills help the parser split it up."
          className="mt-2 min-h-40 w-full resize-y rounded-xl border border-black/10 bg-background px-3 py-2 text-sm transition-colors placeholder:opacity-50 focus-visible:border-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        />

        <button
          type="button"
          onClick={() => void handlePasteImport()}
          disabled={pastedText.trim() === "" || isPasting}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 disabled:opacity-60"
        >
          <ClipboardText size={18} aria-hidden />
          {isPasting ? "Creating..." : "Create resume from text"}
        </button>

        {pasteError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {pasteError}
          </p>
        ) : null}
      </section>

      {PDF_IMPORT_ENABLED ? (
        <section
          aria-labelledby="launcher-pdf-heading"
          className="rounded-2xl border border-black/10 bg-background p-6"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="launcher-pdf-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Upload a PDF
            </h2>
            <p className="text-sm opacity-70">
              Choose an existing resume PDF and its text is read locally into
              editable sections. Scans and image-only files need pasted text.
            </p>
          </div>

          <label
            htmlFor="resume-pdf-input"
            aria-disabled={isReadingPdf}
            className={`mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-6 text-center transition-colors hover:border-black/40 ${
              isReadingPdf ? "cursor-wait opacity-60" : ""
            }`}
          >
            <UploadSimple size={28} aria-hidden />
            <span className="text-sm font-medium">
              {isReadingPdf ? "Reading..." : "Choose a PDF"}
            </span>
            <span className="text-xs opacity-70">
              Drop it here or tap to browse
            </span>
            <input
              id="resume-pdf-input"
              aria-label="Resume PDF"
              type="file"
              accept=".pdf,application/pdf"
              disabled={isReadingPdf}
              onChange={handlePdfChange}
              className="sr-only"
            />
          </label>

          {pdfFileName ? (
            <p
              className="mt-3 flex items-center gap-2 text-sm"
              aria-live="polite"
            >
              <FileText size={16} aria-hidden />
              <span className="truncate">{pdfFileName}</span>
              {isReadingPdf ? (
                <span className="opacity-70">Reading...</span>
              ) : null}
            </p>
          ) : null}

          {pdfError ? (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {pdfError}
            </p>
          ) : null}
        </section>
      ) : null}

      <section
        aria-labelledby="launcher-scratch-heading"
        className="rounded-2xl border border-black/10 bg-background p-6"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="launcher-scratch-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Start from scratch
          </h2>
          <p className="text-sm opacity-70">
            Pick a role to load a complete, editable sample.
          </p>
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {ARCHETYPES.map((archetype) => (
            <li key={archetype.id}>
              <button
                type="button"
                onClick={() => void handleArchetype(archetype)}
                disabled={creatingId !== null}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 text-left transition-colors hover:border-black/30 active:bg-black/5 disabled:opacity-60"
              >
                <span className="flex flex-col gap-1">
                  <span className="font-medium">{archetype.label}</span>
                  <span className="text-sm opacity-70">
                    {archetype.description}
                  </span>
                </span>
                <ArrowRight
                  size={18}
                  aria-hidden
                  className="shrink-0 opacity-60"
                />
              </button>
            </li>
          ))}
        </ul>

        {createError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {createError}
          </p>
        ) : null}
      </section>

      <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-4">
        <button
          type="button"
          aria-expanded={backupOpen}
          aria-controls={backupOpen ? "launcher-backup-panel" : undefined}
          onClick={() => {
            setBackupOpen((open) => !open);
            setBackupError(null);
          }}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <BoxArrowDown size={18} aria-hidden />
            Backup &amp; Restore
          </span>
          <CaretDown
            size={16}
            aria-hidden
            className={`shrink-0 opacity-60 transition-transform ${
              backupOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <p className="mt-1 text-xs opacity-70">
          For moving or safeguarding a resume you already started. Not the main
          way to begin.
        </p>

        {backupOpen ? (
          <div
            id="launcher-backup-panel"
            className="mt-4 flex flex-col gap-3 border-t border-black/10 pt-4"
          >
            <p className="text-sm opacity-70">
              Restore a JSON backup you exported earlier. To make a new backup,
              open a resume and choose <strong>Download JSON backup</strong> in
              the editor.
            </p>

            <label
              htmlFor="resume-backup-input"
              aria-disabled={isRestoring}
              className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 px-4 py-5 text-center transition-colors hover:border-black/40 ${
                isRestoring ? "cursor-wait opacity-60" : ""
              }`}
            >
              <BoxArrowDown size={24} aria-hidden />
              <span className="text-sm font-medium">
                {isRestoring ? "Restoring..." : "Choose a JSON backup"}
              </span>
              <span className="text-xs opacity-70">
                Drop it here or tap to browse
              </span>
              <input
                id="resume-backup-input"
                aria-label="Resume backup file"
                type="file"
                accept=".json,application/json"
                disabled={isRestoring}
                onChange={handleBackupChange}
                className="sr-only"
              />
            </label>

            {backupFileName ? (
              <p
                className="flex items-center gap-2 text-sm"
                aria-live="polite"
              >
                <FileText size={16} aria-hidden />
                <span className="truncate">{backupFileName}</span>
                {isRestoring ? (
                  <span className="opacity-70">Restoring...</span>
                ) : null}
              </p>
            ) : null}

            {backupError ? (
              <p role="alert" className="text-sm text-red-700">
                {backupError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
