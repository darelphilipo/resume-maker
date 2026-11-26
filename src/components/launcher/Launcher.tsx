"use client";

import {
  ArrowRight,
  BoxArrowDown,
  Briefcase,
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
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { copyText } from "@/lib/clipboard/copyText";
import { PDF_IMPORT_ENABLED } from "@/lib/features";
import {
  AI_IMPORT_PROMPT,
  parseAiJsonResume,
} from "@/lib/import/aiJsonImport";
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
  updateResumeMeta,
  type ResumeRow,
} from "@/lib/store/db";
import {
  clampRecentPage,
  recentPageCount,
  recentPageRows,
  recentResumeEditedLabel,
  recentResumeName,
} from "@/lib/store/recentResumes";
import {
  filterResumesByStatus,
  isResumeStatus,
  normalizeTargetCompany,
  RESUME_STATUSES,
  RESUME_STATUS_LABELS,
  resolveStatusFilter,
  resumeStatusCounts,
  resumeStatusOf,
  resumeTargetCompany,
  type ResumeStatus,
  type ResumeStatusFilter,
} from "@/lib/store/resumeTracking";
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
const RECENT_LOAD_LIMIT = 50;
const TRUST_POINTS = [
  { label: "100% Free", icon: CurrencyDollar },
  { label: "No Sign-Up", icon: ShieldCheck },
  { label: "Works Offline in Your Browser", icon: WifiSlash },
] as const satisfies ReadonlyArray<{ label: string; icon: Icon }>;

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-[#d8d2c6] bg-[#fbfaf7] px-3 py-2.5 text-sm text-[#172839] transition-colors placeholder:text-[#8a8f94] focus-visible:border-[#1b3a57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57]/15";

/**
 * Derive the next textarea value from a paste on the same tick. Safari can
 * delay its `change` event, so the import buttons must not wait for the browser
 * to echo the value back.
 */
function pastedTextValue(
  event: ClipboardEvent<HTMLTextAreaElement>,
): string | null {
  const pasted = event.clipboardData?.getData("text") ?? "";

  if (pasted === "") {
    return null;
  }

  const textarea = event.currentTarget;
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;

  return `${textarea.value.slice(0, start)}${pasted}${textarea.value.slice(end)}`;
}

const STATUS_BADGE_CLASSES: Record<ResumeStatus, string> = {
  master: "border-[#d8d2c6] bg-[#f1ede5] text-[#33465a]",
  draft: "border-[#d8d2c6] bg-white text-[#5b6a7a]",
  applied: "border-[#bcd3e8] bg-[#eef5fb] text-[#1b3a57]",
  interview: "border-[#e2d09a] bg-[#fdf5dd] text-[#8a5a12]",
  offer: "border-[#b9d8c3] bg-[#ecf7ef] text-[#1f6b3a]",
};

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

type UtilityDisclosureProps = {
  id: string;
  icon: Icon;
  title: string;
  open: boolean;
  onToggle(): void;
  children: ReactNode;
};

/** A quiet, collapsed secondary option inside the launcher utility strip. */
function UtilityDisclosure({
  id,
  icon: DisclosureIcon,
  title,
  open,
  onToggle,
  children,
}: UtilityDisclosureProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e3ddd2] bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-[#fbfaf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-inset"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[#33465a]">
          <DisclosureIcon size={18} aria-hidden className="shrink-0 text-[#7a8794]" />
          <span className="truncate">{title}</span>
        </span>
        <CaretDown
          size={16}
          aria-hidden
          className={`shrink-0 text-[#7a8794] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div id={id} className="border-t border-[#e6e0d6] px-3 pb-3 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

type RecentResumeTrackingProps = {
  row: ResumeRow;
  name: string;
  saving: boolean;
  onStatusChange(row: ResumeRow, status: ResumeStatus): void;
  onTargetCompanyChange(row: ResumeRow, targetCompany: string): void;
};

/**
 * Compact tracking row under a saved resume: a status pill that doubles as a
 * quick selector and an editable target-company tag. Both stop row-click
 * propagation so editing a tag never opens the resume. Local drafts keep typing
 * smooth; the parent remounts it when the stored values change.
 */
function RecentResumeTracking({
  row,
  name,
  saving,
  onStatusChange,
  onTargetCompanyChange,
}: RecentResumeTrackingProps) {
  const storedCompany = resumeTargetCompany(row);
  const [statusDraft, setStatusDraft] = useState<ResumeStatus>(() =>
    resumeStatusOf(row),
  );
  const [companyDraft, setCompanyDraft] = useState(storedCompany);

  function commitCompany() {
    const next = normalizeTargetCompany(companyDraft);

    setCompanyDraft(next);

    if (next !== storedCompany) {
      onTargetCompanyChange(row, next);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label htmlFor={`recent-status-${row.id}`} className="sr-only">
        Application status for {name}
      </label>
      <select
        id={`recent-status-${row.id}`}
        value={statusDraft}
        disabled={saving}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();

          const next = event.currentTarget.value;

          if (!isResumeStatus(next)) {
            return;
          }

          setStatusDraft(next);
          onStatusChange(row, next);
        }}
        className={`min-h-9 shrink-0 rounded-full border px-2.5 text-xs font-semibold transition-colors pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57]/30 disabled:cursor-wait disabled:opacity-60 ${STATUS_BADGE_CLASSES[statusDraft]}`}
      >
        {RESUME_STATUSES.map((status) => (
          <option key={status} value={status}>
            {RESUME_STATUS_LABELS[status]}
          </option>
        ))}
      </select>

      <label
        htmlFor={`recent-company-${row.id}`}
        onClick={(event) => event.stopPropagation()}
        className="flex min-h-9 min-w-0 flex-1 basis-40 cursor-text items-center gap-1.5 rounded-full border border-[#e3ddd2] bg-white px-3 transition-colors hover:border-[#c9c2b6] pointer-coarse:min-h-11 focus-within:border-[#1b3a57]"
      >
        <span className="sr-only">Target company for {name}</span>
        <Briefcase size={13} aria-hidden className="shrink-0 text-[#7a8794]" />
        <input
          id={`recent-company-${row.id}`}
          value={companyDraft}
          disabled={saving}
          placeholder="Target company"
          onChange={(event) => setCompanyDraft(event.currentTarget.value)}
          onBlur={commitCompany}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="min-h-9 min-w-0 flex-1 bg-transparent text-xs text-[#172839] placeholder:text-[#8a8f94] pointer-coarse:min-h-11 focus-visible:outline-none disabled:cursor-wait"
        />
      </label>
    </div>
  );
}

export function Launcher() {
  const router = useRouter();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPastedText, setAiPastedText] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiImporting, setIsAiImporting] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [aiPromptPreviewOpen, setAiPromptPreviewOpen] = useState(false);
  const aiDisclosureRef = useRef<HTMLDivElement>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuggestAi, setPdfSuggestAi] = useState(false);
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
  const [recentPage, setRecentPage] = useState(1);
  const [statusFilter, setStatusFilter] =
    useState<ResumeStatusFilter>("all");
  const [savingMetaId, setSavingMetaId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!aiCopied) {
      return;
    }

    const timer = window.setTimeout(() => setAiCopied(false), 1500);

    return () => window.clearTimeout(timer);
  }, [aiCopied]);

  async function handlePdfChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setPdfFileName(file.name);
    setPdfError(null);
    setPdfSuggestAi(false);
    setIsReadingPdf(true);

    let doc: ResumeDocument;

    try {
      const { parsePdfResume } = await import("@/lib/import/pdfResume");
      const result = await parsePdfResume(await file.arrayBuffer());

      if (result.text.trim() === "") {
        setPdfError(PDF_NO_TEXT_MESSAGE);
        setPdfSuggestAi(true);
        return;
      }

      if (!result.doc) {
        setPdfError(PASTE_ERROR_MESSAGE);
        return;
      }

      doc = result.doc;
    } catch {
      setPdfError(PDF_READ_ERROR_MESSAGE);
      setPdfSuggestAi(true);
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

  function openAiImport() {
    setPdfSuggestAi(false);
    setAiOpen(true);
    setAiError(null);
    // The disclosure is already mounted, so the ref is valid on this same tick.
    aiDisclosureRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleCopyAiPrompt() {
    const copied = await copyText(AI_IMPORT_PROMPT);

    if (copied) {
      setAiCopied(true);
    }
  }

  async function handleAiImport() {
    if (aiPastedText.trim() === "" || isAiImporting) {
      return;
    }

    setIsAiImporting(true);
    setAiError(null);

    try {
      const parsed = parseAiJsonResume(aiPastedText);

      if (!parsed.ok) {
        setAiError(parsed.error);
        return;
      }

      const safeDoc = sanitizeResumeDocument(parsed.doc);
      const id = await useResumeStore.getState().importResume(safeDoc);
      router.push(`/editor?id=${id}`);
    } catch {
      setAiError(CREATE_RESUME_MESSAGE);
    } finally {
      setIsAiImporting(false);
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
    const next = pastedTextValue(event);

    if (next === null) {
      return;
    }

    setPastedText(next);
    setPasteError(null);
  }

  function handleAiPasteText(event: ClipboardEvent<HTMLTextAreaElement>) {
    const next = pastedTextValue(event);

    if (next === null) {
      return;
    }

    setAiPastedText(next);
    setAiError(null);
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

  async function handleStatusChange(row: ResumeRow, status: ResumeStatus) {
    if (savingMetaId) {
      return;
    }

    setSavingMetaId(row.id);
    setRecentError(null);

    try {
      const updated = await updateResumeMeta(row.id, { status });

      if (!updated) {
        setRecentError(RECENT_MISSING_MESSAGE);
      }

      await refreshRecent();
    } catch {
      setRecentError(RECENT_ERROR_MESSAGE);
    } finally {
      setSavingMetaId(null);
    }
  }

  async function handleTargetCompanyChange(
    row: ResumeRow,
    targetCompany: string,
  ) {
    if (savingMetaId) {
      return;
    }

    setSavingMetaId(row.id);
    setRecentError(null);

    try {
      const updated = await updateResumeMeta(row.id, { targetCompany });

      if (!updated) {
        setRecentError(RECENT_MISSING_MESSAGE);
      }

      await refreshRecent();
    } catch {
      setRecentError(RECENT_ERROR_MESSAGE);
    } finally {
      setSavingMetaId(null);
    }
  }

  const recentRows = recent ?? [];
  const statusCounts = resumeStatusCounts(recentRows);
  const activeStatusFilter = resolveStatusFilter(recentRows, statusFilter);
  const filteredRecent = filterResumesByStatus(
    recentRows,
    activeStatusFilter,
  );
  const recentPages = recentPageCount(filteredRecent.length);
  const safeRecentPage = clampRecentPage(recentPage, filteredRecent.length);
  const visibleRecent = recentPageRows(filteredRecent, safeRecentPage);
  const statusFilterOptions: ResumeStatusFilter[] = [
    "all",
    ...RESUME_STATUSES.filter((status) => statusCounts[status] > 0),
  ];

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

      {recentRows.length > 0 || recentError ? (
        <section
          aria-labelledby="launcher-recent-heading"
          className="rounded-2xl border border-[#e3ddd2] bg-white p-5 shadow-[0_2px_8px_rgba(23,40,57,0.04)] sm:p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="launcher-recent-heading"
              className="font-serif text-2xl font-semibold tracking-tight"
            >
              Recent resumes
            </h2>
            <p className="text-xs text-[#6a7683]">
              Saved in this browser. Pick up where you left off.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {recentRows.length > 0 ? (
              <div className="flex flex-col gap-2">
                {recentRows.length >= 2 ? (
                  <div
                    role="group"
                    aria-label="Filter recent resumes by status"
                    className="flex flex-wrap gap-1.5"
                  >
                    {statusFilterOptions.map((filter) => {
                      const isActive = activeStatusFilter === filter;
                      const count =
                        filter === "all"
                          ? recentRows.length
                          : statusCounts[filter];

                      return (
                        <button
                          key={filter}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setStatusFilter(filter);
                            setRecentPage(1);
                          }}
                          className={`min-h-9 rounded-full border px-2.5 text-xs font-medium transition-colors pointer-coarse:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57]/30 ${
                            isActive
                              ? "border-[#1b3a57] bg-[#1b3a57] text-white"
                              : "border-[#e3ddd2] bg-white text-[#33465a] hover:border-[#c9c2b6]"
                          }`}
                        >
                          {filter === "all"
                            ? "All"
                            : RESUME_STATUS_LABELS[filter]}{" "}
                          ({count})
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <ul
                  id="recent-resume-list"
                  aria-label="Recent resumes"
                  className="flex flex-col gap-2"
                >
                  {visibleRecent.map((row) => {
                    const name = recentResumeName(row);
                    const isOpening = openingRecentId === row.id;
                    const isRenaming = renamingId === row.id;
                    const isDeleting = deletingId === row.id;
                    const isDuplicating = duplicatingId === row.id;
                    const rowIsInteractive =
                      isRenaming ||
                      isDeleting ||
                      isDuplicating ||
                      savingMetaId === row.id;

                    return (
                      <li
                        key={row.id}
                        onClick={
                          rowIsInteractive
                            ? undefined
                            : (event) => handleRecentRowClick(event, row)
                        }
                        className={`group rounded-xl border border-[#e3ddd2] bg-[#fbfaf7] px-3 py-2.5 ${
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
                              <span className="flex min-w-0 items-center gap-1">
                                <span
                                  className={`truncate text-sm font-medium text-[#172839] ${
                                    rowIsInteractive
                                      ? ""
                                      : "group-hover:text-[#1b3a57] group-hover:underline group-hover:underline-offset-2"
                                  }`}
                                >
                                  {name}
                                </span>
                                <ArrowRight
                                  size={14}
                                  aria-hidden
                                  data-recent-open-cue
                                  className={`shrink-0 text-[#7a8794] transition-opacity ${
                                    rowIsInteractive
                                      ? "hidden"
                                      : "opacity-0 group-hover:opacity-100"
                                  }`}
                                />
                              </span>
                              <span className="flex min-w-0 items-center gap-1.5 text-xs text-[#6a7683]">
                                {isOpening ? (
                                  <CircleNotch
                                    size={12}
                                    aria-hidden
                                    className="shrink-0 animate-spin"
                                  />
                                ) : null}
                                <span className="truncate">
                                  {isOpening
                                    ? "Opening..."
                                    : recentResumeEditedLabel(row.updatedAt)}
                                </span>
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
                                  className="min-h-11 rounded-lg border border-[#b42318] bg-white px-2.5 text-xs font-semibold text-red-700/80 transition-colors hover:bg-red-50 hover:text-red-800"
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
                                  className="flex size-11 items-center justify-center rounded-lg border border-[#e3ddd2] bg-white text-red-700/80 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                                >
                                  <Trash size={16} aria-hidden />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {isRenaming ? null : (
                          <RecentResumeTracking
                            key={`${row.id}:${resumeStatusOf(row)}:${resumeTargetCompany(row)}`}
                            row={row}
                            name={name}
                            saving={savingMetaId === row.id}
                            onStatusChange={(targetRow, status) =>
                              void handleStatusChange(targetRow, status)
                            }
                            onTargetCompanyChange={(targetRow, company) =>
                              void handleTargetCompanyChange(targetRow, company)
                            }
                          />
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

                {recentPages > 1 ? (
                  <nav
                    aria-label="Recent resumes pages"
                    className="flex items-center justify-between gap-2 border-t border-[#e6e0d6] pt-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setRecentPage(clampRecentPage(safeRecentPage - 1, filteredRecent.length))
                      }
                      disabled={safeRecentPage === 1}
                      className="min-h-11 rounded-lg border border-[#e3ddd2] bg-white px-3 text-sm font-medium text-[#33465a] transition-colors hover:bg-[#fbfaf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span
                      aria-live="polite"
                      className="text-xs font-medium text-[#5b6a7a]"
                    >
                      Page {safeRecentPage} of {recentPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRecentPage(clampRecentPage(safeRecentPage + 1, filteredRecent.length))
                      }
                      disabled={safeRecentPage === recentPages}
                      className="min-h-11 rounded-lg border border-[#e3ddd2] bg-white px-3 text-sm font-medium text-[#33465a] transition-colors hover:bg-[#fbfaf7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </nav>
                ) : null}
              </div>
            ) : null}

            {recentError ? (
              <p role="alert" className="text-sm text-[#b42318]">
                {recentError}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="mt-1 flex flex-col gap-1 border-t border-[#e6e0d6] pt-5 sm:mt-2 sm:pt-6">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          Choose one way to start
        </h2>
        <p className="text-sm text-[#5b6a7a]">
          Upload the resume you already have, or build a fresh one. Everything
          stays editable, and more import options sit quietly below.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {PDF_IMPORT_ENABLED ? (
          <EntryCard
            headingId="launcher-pdf-heading"
            icon={FilePdf}
            title="Upload a PDF"
            description="The fastest way to begin. Choose an existing resume PDF and its text is read locally into editable sections — nothing is uploaded."
            badge="Recommended"
            className="border-[#c9d8e6] bg-[#fbfdff]"
          >
            {/* `relative` keeps the clipped file input anchored to this card, so
                focusing it cannot scroll the page (and the mobile chrome). */}
            <label
              htmlFor="resume-pdf-input"
              aria-disabled={isReadingPdf}
              className={`relative flex min-h-44 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9c2b6] bg-[#fbfaf7] px-4 py-6 text-center transition-colors hover:border-[#1b3a57] hover:bg-[#f6f8f9] ${
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
              <div role="alert" className="mt-3 text-sm text-[#b42318]">
                <p>{pdfError}</p>
                {pdfSuggestAi ? (
                  <button
                    type="button"
                    onClick={openAiImport}
                    className="mt-2 min-h-11 rounded-lg border border-[#d8d2c6] bg-white px-3 text-sm font-semibold text-[#1b3a57] transition-colors hover:bg-[#f6f8f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] pointer-coarse:min-h-11"
                  >
                    Import via AI prompt instead
                  </button>
                ) : null}
              </div>
            ) : null}
          </EntryCard>
        ) : null}

        <EntryCard
          headingId="launcher-scratch-heading"
          icon={ListChecks}
          title="Start from scratch"
          description="Start blank, or pick a role to load a complete, editable sample. Keep what fits and replace the rest with your own experience."
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
        </EntryCard>
      </div>

      <div
        role="group"
        aria-labelledby="launcher-utilities-heading"
        className="rounded-2xl border border-[#e3ddd2] bg-white p-4"
      >
        <h2
          id="launcher-utilities-heading"
          className="font-serif text-lg font-semibold tracking-tight text-[#33465a]"
        >
          Other ways to import
        </h2>
        <p className="mt-1 text-xs text-[#6a7683]">
          Already have resume text, a scanned PDF, or a backup? These stay tucked
          away so the two choices above stay quick on a phone.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          <UtilityDisclosure
            id="launcher-paste-panel"
            icon={ClipboardText}
            title="Paste resume text"
            open={pasteOpen}
            onToggle={() => {
              setPasteOpen((open) => !open);
              setPasteError(null);
            }}
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
              rows={4}
              placeholder="Paste your resume here. Headings such as Experience, Education, and Skills help the parser split it up."
              className={`${INPUT_CLASS} min-h-28 resize-none`}
            />

            <button
              type="button"
              onClick={() => void handlePasteImport()}
              disabled={pastedText.trim() === "" || isPasting}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-[#172839] px-4 py-3 text-sm font-semibold text-white enabled:hover:bg-[#24496b] enabled:active:bg-[#10202f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-[#d8d2c6] disabled:bg-[#e8e4dc] disabled:text-[#5b6a7a]"
            >
              <ClipboardText size={18} aria-hidden />
              {isPasting ? "Creating..." : "Create resume from text"}
            </button>

            {pasteError ? (
              <p role="alert" className="mt-3 text-sm text-[#b42318]">
                {pasteError}
              </p>
            ) : null}
          </UtilityDisclosure>

          <div ref={aiDisclosureRef}>
            <UtilityDisclosure
              id="launcher-ai-panel"
              icon={Copy}
              title="Import via AI prompt"
              open={aiOpen}
              onToggle={() => {
                setAiOpen((open) => !open);
                setAiError(null);
              }}
            >
              <p className="text-sm leading-relaxed text-[#5b6a7a]">
                <span className="font-medium text-[#33465a]">
                  For scanned or Canva PDFs.
                </span>{" "}
                Resume Maker does not send your resume to any AI. Copy this
                prompt into a chat assistant you trust together with your resume
                text, then paste the JSON reply here — it is parsed on this
                device, and every field stays editable.
              </p>
              <button
                type="button"
                onClick={() => void handleCopyAiPrompt()}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1b3a57] bg-white px-4 py-2.5 text-sm font-semibold text-[#1b3a57] transition-colors hover:bg-[#f6f8f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2"
              >
                <Copy size={16} aria-hidden />
                {aiCopied ? "Copied" : "Copy prompt"}
              </button>

              <button
                type="button"
                aria-expanded={aiPromptPreviewOpen}
                aria-controls={
                  aiPromptPreviewOpen ? "ai-prompt-preview" : undefined
                }
                onClick={() => setAiPromptPreviewOpen((open) => !open)}
                className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-1 text-left text-xs font-medium text-[#33465a] transition-colors hover:text-[#1b3a57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2"
              >
                <span>Preview prompt</span>
                <CaretDown
                  size={14}
                  aria-hidden
                  className={`shrink-0 text-[#7a8794] transition-transform ${
                    aiPromptPreviewOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {aiPromptPreviewOpen ? (
                <div
                  id="ai-prompt-preview"
                  className="mt-1 rounded-lg border border-[#e6e0d6] bg-[#fbfaf7] p-3"
                >
                  <pre
                    tabIndex={0}
                    aria-label="AI import prompt"
                    className="max-h-48 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded font-mono text-[11px] leading-relaxed text-[#33465a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57]/30"
                  >{AI_IMPORT_PROMPT}</pre>
                </div>
              ) : null}

              <label
                htmlFor="ai-json-input"
                className="mt-3 block text-sm font-medium text-[#33465a]"
              >
                Assistant&apos;s JSON reply
              </label>
              <p id="ai-json-hint" className="mt-1 text-xs text-[#6a7683]">
                Markdown fences, a little prose, and trailing commas are fine.
              </p>
              <textarea
                id="ai-json-input"
                aria-describedby="ai-json-hint"
                value={aiPastedText}
                onChange={(event) => {
                  setAiPastedText(event.currentTarget.value);
                  setAiError(null);
                }}
                onPaste={handleAiPasteText}
                rows={4}
                placeholder='Paste the JSON reply here, e.g. {"basics":{"name":"..."}}'
                className={`${INPUT_CLASS} min-h-28 resize-none font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => void handleAiImport()}
                disabled={aiPastedText.trim() === "" || isAiImporting}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#172839] px-4 py-3 text-sm font-semibold text-white enabled:hover:bg-[#24496b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3a57] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#e8e4dc] disabled:text-[#5b6a7a]"
              >
                {isAiImporting ? "Importing..." : "Import resume"}
              </button>

              {aiError ? (
                <p role="alert" className="mt-3 text-sm text-[#b42318]">
                  {aiError}
                </p>
              ) : null}
            </UtilityDisclosure>
          </div>

          <UtilityDisclosure
            id="launcher-backup-panel"
            icon={BoxArrowDown}
            title="Backup & restore"
            open={backupOpen}
            onToggle={() => {
              setBackupOpen((open) => !open);
              setBackupError(null);
            }}
          >
            <p className="text-sm text-[#5b6a7a]">
              Restore a single-resume JSON backup you exported earlier, or a
              resume file in the open JSON Resume format. To make a new backup,
              open a resume and choose <strong>Backup</strong> from the
              top-right menu in the editor header.
            </p>

            <label
              htmlFor="resume-backup-input"
              aria-disabled={isRestoring}
              className={`relative mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9c2b6] bg-[#fbfaf7] px-4 py-5 text-center transition-colors hover:border-[#1b3a57] ${
                isRestoring ? "cursor-wait opacity-60" : ""
              }`}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-[#eef2f6] text-[#1b3a57]">
                <BoxArrowDown size={22} weight="duotone" aria-hidden />
              </span>
              <span className="text-sm font-medium">
                {isRestoring ? "Restoring..." : "Choose a JSON file"}
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
                className="mt-2 flex items-center gap-2 text-sm"
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
              <p role="alert" className="mt-2 text-sm text-[#b42318]">
                {backupError}
              </p>
            ) : null}
          </UtilityDisclosure>
        </div>
      </div>
    </div>
  );
}
