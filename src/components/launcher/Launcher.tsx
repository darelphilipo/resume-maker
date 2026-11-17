"use client";

import {
  ArrowRight,
  BoxArrowDown,
  CaretDown,
  ClipboardText,
  CurrencyDollar,
  FilePdf,
  FileText,
  ListChecks,
  ShieldCheck,
  WifiSlash,
  type Icon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type ReactNode } from "react";

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
  { label: "100% Free", icon: CurrencyDollar },
  { label: "No Sign-Up", icon: ShieldCheck },
  { label: "Works Offline in Your Browser", icon: WifiSlash },
] as const satisfies ReadonlyArray<{ label: string; icon: Icon }>;

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-[#d8d2c6] bg-[#fbfaf7] px-3 py-2.5 text-sm text-[#172839] transition-colors placeholder:text-[#8a8f94] focus-visible:border-[#1b3a57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57]/15";

type EntryCardProps = {
  headingId: string;
  icon: Icon;
  title: string;
  description: string;
  badge?: string;
  className?: string;
  children: ReactNode;
};

function EntryCard({
  headingId,
  icon: CardIcon,
  title,
  description,
  badge,
  className = "",
  children,
}: EntryCardProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={`flex flex-col rounded-2xl border border-[#e3ddd2] bg-white p-5 shadow-[0_2px_8px_rgba(23,40,57,0.04)] sm:p-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2f6] text-[#1b3a57]">
          <CardIcon size={20} weight="duotone" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id={headingId}
              className="text-lg font-semibold tracking-tight text-[#172839]"
            >
              {title}
            </h3>
            {badge ? (
              <span className="rounded-full bg-[#f3e7d3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a5a12]">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-[#5b6a7a]">{description}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

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
    <div className="mt-10 flex flex-col gap-5 sm:mt-12">
      <ul
        aria-label="Resume Maker promises"
        className="flex flex-nowrap items-center justify-center gap-x-2 text-[11px] font-medium leading-tight text-muted sm:gap-x-4 sm:text-sm"
      >
        {TRUST_POINTS.map(({ label, icon: PromiseIcon }, index) => (
          <li
            key={label}
            className="flex items-center gap-1.5 whitespace-nowrap"
          >
            {index > 0 ? (
              <span
                aria-hidden
                className="mr-1 hidden size-1 shrink-0 rounded-full bg-[#c3bbae] sm:block"
              />
            ) : null}
            <PromiseIcon
              size={14}
              weight="bold"
              aria-hidden
              className="hidden shrink-0 text-primary sm:block"
            />
            <span className="whitespace-nowrap">{label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-col gap-1 border-t border-[#e6e0d6] pt-7 sm:mt-5">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          Choose one way to start
        </h2>
        <p className="text-sm text-[#5b6a7a]">
          Pick the option that matches what you already have. Every field stays
          editable.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EntryCard
          headingId="launcher-paste-heading"
          icon={ClipboardText}
          title="Paste your resume"
          description="Copy the text from a PDF, LinkedIn profile, or another tool. The usual headings, dates, and bullet lists are turned into editable sections."
          badge="Recommended"
        >
          <label
            htmlFor="resume-paste-input"
            className="text-sm font-medium text-[#33465a]"
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
            rows={7}
            placeholder="Paste your resume here. Headings such as Experience, Education, and Skills help the parser split it up."
            className={`${INPUT_CLASS} min-h-44 resize-y`}
          />

          <button
            type="button"
            onClick={() => void handlePasteImport()}
            disabled={pastedText.trim() === "" || isPasting}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#172839] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#24496b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 active:bg-[#10202f] disabled:opacity-60"
          >
            <ClipboardText size={18} aria-hidden />
            {isPasting ? "Creating..." : "Create resume from text"}
          </button>

          {pasteError ? (
            <p role="alert" className="mt-3 text-sm text-[#b42318]">
              {pasteError}
            </p>
          ) : null}
        </EntryCard>

        {PDF_IMPORT_ENABLED ? (
          <EntryCard
            headingId="launcher-pdf-heading"
            icon={FilePdf}
            title="Upload a PDF"
            description="Choose an existing resume PDF and its text is read locally into editable sections. Scans and image-only files need pasted text."
          >
            <label
              htmlFor="resume-pdf-input"
              aria-disabled={isReadingPdf}
              className={`flex min-h-44 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9c2b6] bg-[#fbfaf7] px-4 py-6 text-center transition-colors hover:border-[#1b3a57] hover:bg-[#f6f8f9] ${
                isReadingPdf ? "cursor-wait opacity-60" : ""
              }`}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-[#eef2f6] text-[#1b3a57]">
                <FilePdf size={22} weight="duotone" aria-hidden />
              </span>
              <span className="text-sm font-semibold">
                {isReadingPdf ? "Reading..." : "Choose a PDF"}
              </span>
              <span className="text-xs text-[#6a7683]">
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
                className="mt-3 flex items-center gap-2 text-sm text-[#33465a]"
                aria-live="polite"
              >
                <FileText size={16} aria-hidden />
                <span className="truncate">{pdfFileName}</span>
                {isReadingPdf ? (
                  <span className="text-[#6a7683]">Reading...</span>
                ) : null}
              </p>
            ) : null}

            {pdfError ? (
              <p role="alert" className="mt-3 text-sm text-[#b42318]">
                {pdfError}
              </p>
            ) : null}
          </EntryCard>
        ) : null}

        <EntryCard
          headingId="launcher-scratch-heading"
          icon={ListChecks}
          title="Start from scratch"
          description="Pick a role to load a complete, editable sample. Keep what fits and replace the rest with your own experience."
          className="lg:col-span-2"
        >
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {ARCHETYPES.map((archetype) => (
              <li key={archetype.id}>
                <button
                  type="button"
                  onClick={() => void handleArchetype(archetype)}
                  disabled={creatingId !== null}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#e3ddd2] bg-[#fbfaf7] px-4 py-3 text-left transition-colors hover:border-[#1b3a57] hover:bg-white active:bg-[#f1ede5] disabled:opacity-60"
                >
                  <span className="flex flex-col gap-1">
                    <span className="font-medium text-[#172839]">
                      {archetype.label}
                    </span>
                    <span className="text-sm text-[#5b6a7a]">
                      {archetype.description}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    aria-hidden
                    className="shrink-0 text-[#7a8794]"
                  />
                </button>
              </li>
            ))}
          </ul>

          {createError ? (
            <p role="alert" className="mt-3 text-sm text-[#b42318]">
              {createError}
            </p>
          ) : null}
        </EntryCard>
      </div>

      <div className="rounded-2xl border border-dashed border-[#d5cec2] bg-white/50 p-4">
        <button
          type="button"
          aria-expanded={backupOpen}
          aria-controls={backupOpen ? "launcher-backup-panel" : undefined}
          onClick={() => {
            setBackupOpen((open) => !open);
            setBackupError(null);
          }}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[#33465a]">
            <BoxArrowDown size={18} aria-hidden />
            Backup &amp; Restore
          </span>
          <CaretDown
            size={16}
            aria-hidden
            className={`shrink-0 text-[#7a8794] transition-transform ${
              backupOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <p className="mt-1 text-xs text-[#6a7683]">
          For moving or safeguarding a resume you already started. Not the main
          way to begin.
        </p>

        {backupOpen ? (
          <div
            id="launcher-backup-panel"
            className="mt-4 flex flex-col gap-3 border-t border-[#e6e0d6] pt-4"
          >
            <p className="text-sm text-[#5b6a7a]">
              Restore a JSON backup you exported earlier. To make a new backup,
              open a resume and choose <strong>Download JSON backup</strong> in
              the editor.
            </p>

            <label
              htmlFor="resume-backup-input"
              aria-disabled={isRestoring}
              className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#c9c2b6] bg-[#fbfaf7] px-4 py-5 text-center transition-colors hover:border-[#1b3a57] ${
                isRestoring ? "cursor-wait opacity-60" : ""
              }`}
            >
              <BoxArrowDown size={24} aria-hidden />
              <span className="text-sm font-medium">
                {isRestoring ? "Restoring..." : "Choose a JSON backup"}
              </span>
              <span className="text-xs text-[#6a7683]">
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
                  <span className="text-[#6a7683]">Restoring...</span>
                ) : null}
              </p>
            ) : null}

            {backupError ? (
              <p role="alert" className="text-sm text-[#b42318]">
                {backupError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
