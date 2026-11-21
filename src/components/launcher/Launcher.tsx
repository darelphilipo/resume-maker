"use client";

import {
  ArrowRight,
  BoxArrowDown,
  CaretDown,
  CircleNotch,
  ClipboardText,
  Copy,
  CurrencyDollar,
  FilePdf,
  FileText,
  ListChecks,
  PencilSimple,
  Plus,
  ShieldCheck,
  Trash,
  WifiSlash,
  type Icon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { PDF_IMPORT_ENABLED } from "@/lib/features";
import { parsePastedResume } from "@/lib/import/pasteResume";
import { ARCHETYPES, type Archetype } from "@/lib/presets/archetypes";
import { sanitizeResumeDocument } from "@/lib/richtext/sanitize";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { parseResumeJson } from "@/lib/schema/serialize";
import {
  deleteResume,
  duplicateResume,
  listRecentResumes,
  renameResume,
  type ResumeRow,
} from "@/lib/store/db";
import {
  recentResumeEditedLabel,
  recentResumeName,
} from "@/lib/store/recentResumes";
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
const RECENT_ERROR_MESSAGE =
  "Could not read the resumes saved on this device.";
const RECENT_MISSING_MESSAGE =
  "That resume is no longer saved on this device. Pick another one or start a new resume.";
const BLANK_ACTION_ID = "blank";
const RECENT_INITIAL_COUNT = 5;
const RECENT_LOAD_LIMIT = 50;
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
  const [recent, setRecent] = useState<ResumeRow[] | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [openingRecentId, setOpeningRecentId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const refreshRecent = useCallback(async () => {
    try {
      const rows = await listRecentResumes(RECENT_LOAD_LIMIT);
      setRecent(rows);
      setRecentError(null);
    } catch {
      setRecent([]);
      setRecentError(RECENT_ERROR_MESSAGE);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    listRecentResumes(RECENT_LOAD_LIMIT)
      .then((rows) => {
        if (cancelled) {
          return;
        }

        setRecent(rows);
        setRecentError(null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setRecent([]);
        setRecentError(RECENT_ERROR_MESSAGE);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  async function handleBlank() {
    if (creatingId) {
      return;
    }

    setCreatingId(BLANK_ACTION_ID);
    setCreateError(null);

    try {
      const id = await useResumeStore.getState().createResume("onyx");
      router.push(`/editor?id=${id}`);
    } catch {
      setCreateError(CREATE_RESUME_MESSAGE);
    } finally {
      setCreatingId(null);
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

  async function handleOpenRecent(row: ResumeRow) {
    if (openingRecentId) {
      return;
    }

    setOpeningRecentId(row.id);
    setRecentError(null);

    try {
      const loaded = await useResumeStore.getState().loadResume(row.id);

      if (!loaded) {
        setRecentError(RECENT_MISSING_MESSAGE);
        await refreshRecent();
        return;
      }

      router.push(`/editor?id=${row.id}`);
    } catch {
      setRecentError(RECENT_ERROR_MESSAGE);
    } finally {
      setOpeningRecentId(null);
    }
  }

  function handleRecentRowClick(
    event: MouseEvent<HTMLLIElement>,
    row: ResumeRow,
  ) {
    const target = event.target as HTMLElement | null;

    if (target?.closest("button, a, input, form, textarea, select")) {
      return;
    }

    void handleOpenRecent(row);
  }

  function handlePasteText(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = event.clipboardData?.getData("text") ?? "";

    if (pasted === "") {
      return;
    }

    const textarea = event.currentTarget;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const next = `${textarea.value.slice(0, start)}${pasted}${textarea.value.slice(end)}`;

    setPastedText(next);
    setPasteError(null);
  }

  function startRename(row: ResumeRow) {
    setDeletingId(null);
    setRenamingId(row.id);
    setRenameDraft(recentResumeName(row));
    setRecentError(null);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameDraft("");
  }

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = renamingId;
    const name = renameDraft.trim();

    if (!id || name === "") {
      return;
    }

    try {
      const updated = await renameResume(id, name);

      if (!updated) {
        setRecentError(RECENT_MISSING_MESSAGE);
      }

      cancelRename();
      await refreshRecent();
    } catch {
      setRecentError(RECENT_ERROR_MESSAGE);
    }
  }

  async function handleDuplicateRecent(row: ResumeRow) {
    if (duplicatingId) {
      return;
    }

    setDuplicatingId(row.id);
    setRecentError(null);

    try {
      const copy = await duplicateResume(row.id);

      if (!copy) {
        setRecentError(RECENT_MISSING_MESSAGE);
      }

      await refreshRecent();
    } catch {
      setRecentError(RECENT_ERROR_MESSAGE);
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDeleteRecent(row: ResumeRow) {
    try {
      await deleteResume(row.id);
      setDeletingId(null);

      if (renamingId === row.id) {
        cancelRename();
      }

      await refreshRecent();
    } catch {
      setRecentError(RECENT_ERROR_MESSAGE);
    }
  }

  return (
    <div className="mt-7 flex flex-col gap-5 sm:mt-9">
      <ul
        aria-label="Resume Maker promises"
        className="flex flex-nowrap items-center justify-start gap-x-2 text-[11px] font-medium leading-tight text-muted sm:gap-x-4 sm:text-sm"
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

      <div className="mt-1 flex flex-col gap-1 border-t border-[#e6e0d6] pt-5 sm:mt-2 sm:pt-6">
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
          <p id="resume-paste-hint" className="mt-1 text-xs text-[#6a7683]">
            One line is enough — paste your name, a role, or your whole resume.
            Headings and dates help, but they are optional.
          </p>
          <textarea
            id="resume-paste-input"
            aria-describedby="resume-paste-hint"
            value={pastedText}
            onChange={(event) => {
              setPastedText(event.currentTarget.value);
              setPasteError(null);
            }}
            onPaste={handlePasteText}
            rows={7}
            placeholder="Paste your resume here. Headings such as Experience, Education, and Skills help the parser split it up."
            className={`${INPUT_CLASS} min-h-44 resize-none`}
          />

          <button
            type="button"
            onClick={() => void handlePasteImport()}
            disabled={pastedText.trim() === "" || isPasting}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-[#172839] px-4 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-[#24496b] enabled:active:bg-[#10202f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-[#d8d2c6] disabled:bg-[#e8e4dc] disabled:text-[#5b6a7a]"
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
          description="Start blank, or pick a role to load a complete, editable sample. Keep what fits and replace the rest with your own experience."
          className="lg:col-span-2"
        >
          <button
            type="button"
            onClick={() => void handleBlank()}
            disabled={creatingId === BLANK_ACTION_ID}
            aria-busy={creatingId === BLANK_ACTION_ID}
            data-cta="secondary"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d8d2c6] bg-white px-4 py-3 text-sm font-semibold text-[#33465a] transition-colors enabled:hover:border-[#1b3a57] enabled:hover:bg-[#fbfaf7] enabled:active:bg-[#f1ede5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 disabled:cursor-wait disabled:border-[#e3ddd2] disabled:text-[#5b6a7a]"
          >
            {creatingId === BLANK_ACTION_ID ? (
              <CircleNotch size={18} aria-hidden className="animate-spin" />
            ) : (
              <Plus size={18} aria-hidden />
            )}
            {creatingId === BLANK_ACTION_ID
              ? "Creating..."
              : "Start with a blank resume"}
          </button>
          <p className="mt-2 text-xs text-[#6a7683]">
            No sample text — just the standard empty sections, ready for your own
            details.
          </p>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7683]">
            Or start from a role
          </p>
          <ul data-preset-list className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {ARCHETYPES.map((archetype) => {
              const isPending = creatingId === archetype.id;
              const isSiblingPending = creatingId !== null && !isPending;

              return (
                <li key={archetype.id} className="h-full items-start">
                  <button
                    type="button"
                    onClick={() => void handleArchetype(archetype)}
                    disabled={isPending}
                    aria-busy={isPending}
                    aria-disabled={isSiblingPending || undefined}
                    className={`flex h-full min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 ${
                      isPending
                        ? "cursor-wait border-[#1b3a57] bg-white"
                        : "border-[#e3ddd2] bg-[#fbfaf7] hover:border-[#1b3a57] hover:bg-white active:bg-[#f1ede5]"
                    } ${isSiblingPending ? "pointer-events-none" : ""}`}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="font-medium text-[#172839]">
                        {archetype.label}
                      </span>
                      <span className="text-sm text-[#5b6a7a]">
                        {archetype.description}
                      </span>
                    </span>
                    {isPending ? (
                      <CircleNotch
                        size={18}
                        aria-hidden
                        className="shrink-0 animate-spin text-[#1b3a57]"
                      />
                    ) : (
                      <ArrowRight
                        size={18}
                        aria-hidden
                        className="shrink-0 text-[#7a8794]"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {createError ? (
            <p role="alert" className="mt-3 text-sm text-[#b42318]">
              {createError}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 border-t border-[#e6e0d6] pt-4">
            <h4 className="text-sm font-semibold text-[#172839]">
              Recent resumes
            </h4>

            {recent === null ? (
              <p role="status" className="text-sm text-[#5b6a7a]">
                Looking for resumes saved on this device...
              </p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-[#5b6a7a]">
                Nothing saved yet. Resumes you create in this browser appear
                here, so you can reopen them later without an account.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <ul
                  id="recent-resume-list"
                  aria-label="Recent resumes"
                  className="flex flex-col gap-2"
                >
                  {(showAllRecent
                    ? recent
                    : recent.slice(0, RECENT_INITIAL_COUNT)
                  ).map((row) => {
                    const name = recentResumeName(row);
                    const isOpening = openingRecentId === row.id;
                    const isRenaming = renamingId === row.id;
                    const isDeleting = deletingId === row.id;
                    const isDuplicating = duplicatingId === row.id;
                    const rowIsInteractive =
                      isRenaming || isDeleting || isDuplicating;

                    return (
                      <li
                        key={row.id}
                        onClick={
                          rowIsInteractive
                            ? undefined
                            : (event) => handleRecentRowClick(event, row)
                        }
                        className={`rounded-xl border border-[#e3ddd2] bg-[#fbfaf7] px-3 py-2.5 ${
                          rowIsInteractive
                            ? ""
                            : "cursor-pointer transition-colors hover:border-[#c9c2b6] hover:bg-white"
                        }`}
                      >
                        {isRenaming ? (
                          <form
                            onSubmit={(event) => void handleRenameSubmit(event)}
                            className="flex flex-col gap-2"
                          >
                            <label
                              htmlFor={`recent-name-${row.id}`}
                              className="sr-only"
                            >
                              Resume name
                            </label>
                            <input
                              id={`recent-name-${row.id}`}
                              value={renameDraft}
                              onChange={(event) =>
                                setRenameDraft(event.currentTarget.value)
                              }
                              autoFocus
                              className="min-h-11 w-full rounded-lg border border-[#d8d2c6] bg-white px-3 py-2 text-sm text-[#172839] focus-visible:border-[#1b3a57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57]/15"
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={renameDraft.trim() === ""}
                                className="min-h-11 flex-1 rounded-lg bg-[#172839] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#e8e4dc] disabled:text-[#5b6a7a]"
                              >
                                Save name
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  cancelRename();
                                }}
                                className="min-h-11 flex-1 rounded-lg border border-[#e3ddd2] bg-white px-3 text-sm font-medium text-[#33465a]"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleOpenRecent(row)}
                              disabled={isOpening}
                              aria-busy={isOpening}
                              aria-label={`Open ${name}`}
                              className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 disabled:cursor-wait"
                            >
                              <span className="truncate text-sm font-medium text-[#172839]">
                                {name}
                              </span>
                              <span className="truncate text-xs text-[#6a7683]">
                                {isOpening
                                  ? "Opening..."
                                  : recentResumeEditedLabel(row.updatedAt)}
                              </span>
                            </button>

                            {isDeleting ? (
                              <div className="flex shrink-0 gap-1.5">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDeleteRecent(row);
                                  }}
                                  className="min-h-11 rounded-lg border border-[#b42318] bg-white px-2.5 text-xs font-semibold text-[#b42318]"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeletingId(null);
                                  }}
                                  className="min-h-11 rounded-lg border border-[#e3ddd2] bg-white px-2.5 text-xs font-medium text-[#33465a]"
                                >
                                  Keep
                                </button>
                              </div>
                            ) : (
                              <div className="flex shrink-0 gap-1.5">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    startRename(row);
                                  }}
                                  aria-label={`Rename ${name}`}
                                  className="flex size-11 items-center justify-center rounded-lg border border-[#e3ddd2] bg-white text-[#33465a]"
                                >
                                  <PencilSimple size={16} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleDuplicateRecent(row);
                                  }}
                                  disabled={isDuplicating}
                                  aria-busy={isDuplicating}
                                  aria-label={`Duplicate ${name}`}
                                  className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#e3ddd2] bg-white text-[#33465a] disabled:cursor-wait disabled:text-[#8a8f94]"
                                >
                                  <Copy size={16} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRenamingId(null);
                                    setDeletingId(row.id);
                                  }}
                                  aria-label={`Delete ${name}`}
                                  className="flex size-11 items-center justify-center rounded-lg border border-[#e3ddd2] bg-white text-[#33465a]"
                                >
                                  <Trash size={16} aria-hidden />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {isDeleting ? (
                          <p
                            role="status"
                            className="mt-2 text-xs text-[#6a7683]"
                          >
                            Delete this resume? This cannot be undone.
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                {recent.length > RECENT_INITIAL_COUNT ? (
                  <button
                    type="button"
                    aria-expanded={showAllRecent}
                    aria-controls="recent-resume-list"
                    onClick={() => setShowAllRecent((open) => !open)}
                    className="min-h-11 rounded-xl border border-[#e3ddd2] bg-white px-3 text-sm font-medium text-[#33465a] transition-colors hover:bg-[#fbfaf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2"
                  >
                    {showAllRecent
                      ? "Show fewer"
                      : `Show all (${recent.length})`}
                  </button>
                ) : null}
              </div>
            )}

            {recentError ? (
              <p role="alert" className="text-sm text-[#b42318]">
                {recentError}
              </p>
            ) : null}
          </div>
        </EntryCard>
      </div>

      <div className="rounded-2xl border border-[#e3ddd2] bg-white p-4">
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
