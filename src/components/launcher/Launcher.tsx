"use client";

import {
  ArrowRight,
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
import { parseResumeJson } from "@/lib/schema/serialize";
import { useResumeStore } from "@/lib/store/useResumeStore";

const INVALID_FILE_MESSAGE =
  "That file is not a valid resume backup. Check the JSON and try again.";
const PASTE_ERROR_MESSAGE =
  "That text did not look like a resume. Include your name or at least one role, school, or skill and try again.";
const CREATE_RESUME_MESSAGE =
  "Could not create the resume. Your browser may be blocking local storage.";
const TRUST_POINTS = [
  "100% Free",
  "No Sign-Up",
  "Works Offline in Your Browser",
] as const;

export function Launcher() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setFileName(file.name);
    setError(null);
    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = parseResumeJson(text);

      if (!parsed.ok) {
        setError(INVALID_FILE_MESSAGE);
        return;
      }

      const safeDoc = sanitizeResumeDocument(parsed.doc);
      const id = await useResumeStore.getState().importResume(safeDoc);
      router.push(`/editor?id=${id}`);
    } catch {
      setError(INVALID_FILE_MESSAGE);
    } finally {
      setIsImporting(false);
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
    setError(null);

    try {
      const id = await useResumeStore.getState().createResume("onyx");
      useResumeStore.getState().setDoc(archetype.build());
      await useResumeStore.getState().saveNow();
      router.push(`/editor?id=${id}`);
    } catch {
      setError(CREATE_RESUME_MESSAGE);
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

      <section
        aria-labelledby="launcher-import-heading"
        className="rounded-2xl border border-black/10 bg-background p-6"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="launcher-import-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Import existing resume
          </h2>
          <p className="text-sm opacity-70">
            Bring in a JSON backup and keep every section intact.
          </p>
        </div>

        <label
          htmlFor="resume-json-input"
          aria-disabled={isImporting}
          className={`mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-6 text-center transition-colors hover:border-black/40 ${
            isImporting ? "cursor-wait opacity-60" : ""
          }`}
        >
          <UploadSimple size={28} aria-hidden />
          <span className="text-sm font-medium">
            {isImporting ? "Importing..." : "Choose a JSON file"}
          </span>
          <span className="text-xs opacity-70">
            Drop it here or tap to browse
          </span>
          <input
            id="resume-json-input"
            aria-label="Resume JSON file"
            type="file"
            accept={
              PDF_IMPORT_ENABLED
                ? ".pdf,.json,application/pdf,application/json"
                : ".json,application/json"
            }
            disabled={isImporting}
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {fileName ? (
          <p className="mt-3 flex items-center gap-2 text-sm" aria-live="polite">
            <FileText size={16} aria-hidden />
            <span className="truncate">{fileName}</span>
            {isImporting ? <span className="opacity-70">Importing...</span> : null}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

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
      </section>
    </div>
  );
}
