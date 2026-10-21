"use client";

import { ArrowRight, FileText, UploadSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";

import { PDF_IMPORT_ENABLED } from "@/lib/features";
import { ARCHETYPES, type Archetype } from "@/lib/presets/archetypes";
import { sanitizeResumeDocument } from "@/lib/richtext/sanitize";
import { parseResumeJson } from "@/lib/schema/serialize";
import { useResumeStore } from "@/lib/store/useResumeStore";

const INVALID_FILE_MESSAGE =
  "That file is not a valid resume backup. Check the JSON and try again.";
const CREATE_RESUME_MESSAGE =
  "Could not create the resume. Your browser may be blocking local storage.";

export function Launcher() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
