"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowsDownUp,
  Eye,
  EyeSlash,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  formatMonth,
  parseMonthInput,
  toMonthValue,
} from "@/lib/date/month";
const INPUT_CLASS =
  "min-h-11 w-full min-w-0 max-w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text caret-primary transition-colors placeholder:text-muted placeholder:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-surface-muted disabled:text-muted";

const ACTION_BUTTON_CLASS =
  "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-line disabled:hover:bg-transparent pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:px-2.5 pointer-coarse:py-2";

/** Same footprint as the move buttons, with a quiet destructive cue on hover. */
const DELETE_BUTTON_CLASS =
  "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-surface px-2 py-1.5 text-sm font-medium text-red-700/80 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:px-2.5 pointer-coarse:py-2";

export type TextInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "url";
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
};

export function TextInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  hint,
}: TextInputProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={INPUT_CLASS}
      />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

const MONTH_OPTIONS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
] as const;

const YEAR_PATTERN = /^\d{4}$/;

export type MonthSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  /** Inline sanity note (for example a reversed range), kept above the hint. */
  warning?: string;
  /** End-date only: show a Present toggle and disable the picker while on. */
  present?: boolean;
  onPresentChange?: (present: boolean) => void;
};

/**
 * One fast Month + Year picker for every dated section. Native
 * `<input type="month">` opens a browser-dependent year scroller (often a
 * modal wheel on phones), so this pairs a Jan–Dec select with a four-digit
 * year field instead. Both controls keep the shared white `min-h-11` surface
 * and the stored value stays canonical `YYYY-MM`, or a bare `YYYY` when the
 * user only knows the year.
 */
export function MonthSelect({
  id,
  label,
  value,
  onChange,
  hint,
  warning,
  present,
  onPresentChange,
}: MonthSelectProps) {
  const monthValue = toMonthValue(value);
  const yearOnly = /^\d{4}$/.test(value.trim()) ? value.trim() : "";
  const storedYear = monthValue === "" ? yearOnly : monthValue.slice(0, 4);
  const storedMonth = monthValue === "" ? "" : monthValue.slice(5, 7);
  const [monthDraft, setMonthDraft] = useState(storedMonth);
  const [yearDraft, setYearDraft] = useState(storedYear);
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setMonthDraft(storedMonth);
    setYearDraft(storedYear);
  }

  const isPresent = present === true;
  const labelId = `${id}-label`;
  const monthId = `${id}-month`;
  const yearId = `${id}-year`;

  function commit(nextYear: string, nextMonth: string): void {
    if (!YEAR_PATTERN.test(nextYear)) {
      return;
    }

    // A year without a month is a valid stored value ("2018"), which prints as
    // "2018 — 2019" in DateRange.
    const next =
      nextMonth === "" ? nextYear : `${nextYear}-${nextMonth}`;
    const current = monthValue === "" ? yearOnly : monthValue;

    if (next !== current) {
      onChange(next);
    }
  }

  function changeMonth(nextMonth: string): void {
    setMonthDraft(nextMonth);

    if (nextMonth === "") {
      setYearDraft("");
      onChange("");
      return;
    }

    commit(yearDraft, nextMonth);
  }

  function changeYear(rawYear: string): void {
    const nextYear = rawYear.replace(/\D/g, "").slice(0, 4);
    setYearDraft(nextYear);

    if (nextYear === "") {
      setMonthDraft("");
      onChange("");
      return;
    }

    commit(nextYear, monthDraft);
  }

  function handleYearKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") {
      return;
    }

    // The year field lives inside the section <form>. Without this, Enter can
    // trigger implicit submission (and the browser's submit handling resets
    // the Content column's scroll to the top).
    event.preventDefault();

    if (YEAR_PATTERN.test(yearDraft)) {
      commit(yearDraft, monthDraft);
    } else {
      setYearDraft(storedYear);
    }

    // Blur mirrors the compact MonthInput: Enter confirms and dismisses the
    // field instead of leaving the keyboard open.
    event.currentTarget.blur();
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-1.5">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={warning ? `${id}-warning` : undefined}
        className="grid w-full min-w-0 max-w-full grid-cols-[minmax(0,1fr)_minmax(0,6rem)] gap-2"
      >
        <select
          id={monthId}
          aria-label={`${label} month`}
          value={monthDraft}
          disabled={isPresent}
          onChange={(event) => changeMonth(event.currentTarget.value)}
          className={INPUT_CLASS}
        >
          <option value="">Month</option>
          {MONTH_OPTIONS.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <input
          id={yearId}
          type="text"
          aria-label={`${label} year`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Year"
          maxLength={4}
          value={yearDraft}
          disabled={isPresent}
          onChange={(event) => changeYear(event.currentTarget.value)}
          onKeyDown={handleYearKeyDown}
          onBlur={() => {
            if (!YEAR_PATTERN.test(yearDraft)) {
              setYearDraft(storedYear);
            }
          }}
          className={INPUT_CLASS}
        />
      </div>
      {warning ? (
        <p
          id={`${id}-warning`}
          className="text-xs font-medium text-amber-700"
        >
          {warning}
        </p>
      ) : null}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {onPresentChange ? (
        <BooleanInput
          id={`${id}-present`}
          label="Present"
          checked={isPresent}
          onChange={onPresentChange}
        />
      ) : null}
    </div>
  );
}

export type MonthInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};

/**
 * Compact month field for narrow, two-column layouts. Native month inputs
 * render a locale label ("October 2023") that clips in half-width cells, so
 * this shows the short form ("Oct 2023") while still storing `YYYY-MM`.
 */
export function MonthInput({
  id,
  label,
  value,
  onChange,
  hint,
}: MonthInputProps) {
  const [draft, setDraft] = useState(() => formatMonth(value));
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    setDraft(formatMonth(value));
  }

  function commitDraft(): void {
    const parsed = parseMonthInput(draft);

    if (parsed === null) {
      const raw = draft.trim();

      if (raw !== value) {
        onChange(raw);
      }

      return;
    }

    setDraft(formatMonth(parsed));

    if (parsed !== value) {
      onChange(parsed);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="Oct 2023"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={INPUT_CLASS}
      />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export type LevelInputProps = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function LevelInput({ id, label, value, onChange }: LevelInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={0}
          max={5}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
          className="min-h-11 flex-1 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        />
        <span aria-hidden className="w-6 text-right text-sm tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
}

export type BooleanInputProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function BooleanInput({
  id,
  label,
  checked,
  onChange,
}: BooleanInputProps) {
  return (
    <div className="flex items-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        className="h-5 w-5 rounded border-black/20 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      />
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-center pl-2 text-sm"
      >
        {label}
      </label>
    </div>
  );
}

export function EntryCard({
  index,
  hidden = false,
  children,
}: {
  index: number;
  /** Dims an entry that is excluded from the preview and print, not deleted. */
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset
      data-hidden={hidden ? "true" : undefined}
      className={`flex w-full min-w-0 max-w-full flex-col gap-3 rounded-xl border border-line bg-surface-muted p-3 transition-opacity ${
        hidden ? "opacity-60 focus-within:opacity-100 hover:opacity-100" : ""
      }`}
    >
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        Entry {index + 1}
      </legend>
      {children}
    </fieldset>
  );
}

export type EntryActionsProps = {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  /** Omit to hide the visibility toggle (e.g. a section without hiding). */
  hidden?: boolean;
  onToggleHidden?: () => void;
};

type ScrollerSnapshot = {
  element: HTMLElement;
  scrollTop: number;
};

type PendingMove = {
  scrollers: ScrollerSnapshot[];
  button: HTMLButtonElement | null;
};

const SCROLLABLE_OVERFLOW_Y = /(auto|scroll|overlay)/;

/**
 * Every overflowing ancestor of `element`, not just the nearest one. On the
 * desktop editor that is `#panel-content`; on phones it is `<main>`; inside a
 * drawer it is the sheet body. Capturing all of them means the restore cannot
 * miss whichever container the browser actually clamps.
 */
function scrollableAncestors(element: Element | null): HTMLElement[] {
  const found: HTMLElement[] = [];

  if (
    typeof window === "undefined" ||
    typeof window.getComputedStyle !== "function"
  ) {
    return found;
  }

  let node = element?.parentElement ?? null;

  while (node) {
    if (
      node instanceof HTMLElement &&
      SCROLLABLE_OVERFLOW_Y.test(window.getComputedStyle(node).overflowY)
    ) {
      found.push(node);
    }

    node = node.parentElement;
  }

  return found;
}

export function EntryActions({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  hidden = false,
  onToggleHidden,
}: EntryActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const [moveTick, setMoveTick] = useState(0);
  const entryNumber = index + 1;

  /**
   * A reorder moves the clicked button's DOM node. Browsers drop focus back to
   * `body` when a focused node is reinserted, which can scroll the Content
   * column (or the drawer body) back to the top. Remember the offset and the
   * physical button before the move, then restore both after the reordered DOM
   * is committed but before paint.
   */
  function handleMove(direction: -1 | 1): void {
    pendingMoveRef.current = {
      scrollers: scrollableAncestors(rootRef.current).map((element) => ({
        element,
        scrollTop: element.scrollTop,
      })),
      button: direction === -1 ? upRef.current : downRef.current,
    };

    if (direction === -1) {
      onMoveUp();
    } else {
      onMoveDown();
    }

    // The parent should change `index`, but always schedule the restore so a
    // rejected boundary move cannot leave a stale pending entry behind.
    setMoveTick((tick) => tick + 1);
  }

  useLayoutEffect(() => {
    const pending = pendingMoveRef.current;

    if (!pending) {
      return;
    }

    pendingMoveRef.current = null;

    for (const { element, scrollTop } of pending.scrollers) {
      if (element.scrollTop !== scrollTop) {
        element.scrollTop = scrollTop;
      }
    }

    // The clicked button can land on a list boundary and become disabled, and
    // a disabled button cannot hold focus. Fall back to its sibling so focus
    // never drops to <body> (which lets the browser jump the column to 0).
    const focusTarget =
      pending.button && !pending.button.disabled
        ? pending.button
        : pending.button === downRef.current
          ? upRef.current
          : downRef.current;

    // `preventScroll` stops the browser from scrolling the container when the
    // moved node is re-inserted and focus lands back on it.
    focusTarget?.focus({ preventScroll: true });
  }, [moveTick]);

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2">
        <p className="text-sm text-red-900">Delete this entry?</p>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onDelete();
          }}
          className="inline-flex min-h-11 items-center rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Confirm delete entry {entryNumber}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className={ACTION_BUTTON_CLASS}
        >
          Cancel delete entry {entryNumber}
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex min-w-0 flex-wrap items-center gap-1">
      {onToggleHidden ? (
        <button
          type="button"
          aria-label={`${hidden ? "Show" : "Hide"} entry ${entryNumber}`}
          aria-pressed={hidden}
          onClick={onToggleHidden}
          className={ACTION_BUTTON_CLASS}
        >
          {hidden ? (
            <EyeSlash size={16} aria-hidden />
          ) : (
            <Eye size={16} aria-hidden />
          )}
        </button>
      ) : null}
      <button
        ref={upRef}
        type="button"
        aria-label={`Move up entry ${entryNumber}`}
        disabled={index === 0}
        onClick={() => handleMove(-1)}
        className={ACTION_BUTTON_CLASS}
      >
        <ArrowUp size={16} aria-hidden />
        <span>Up</span>
      </button>
      <button
        ref={downRef}
        type="button"
        aria-label={`Move down entry ${entryNumber}`}
        disabled={index === total - 1}
        onClick={() => handleMove(1)}
        className={ACTION_BUTTON_CLASS}
      >
        <ArrowDown size={16} aria-hidden />
        <span>Down</span>
      </button>
      <button
        type="button"
        aria-label={`Delete entry ${entryNumber}`}
        onClick={() => setConfirming(true)}
        className={DELETE_BUTTON_CLASS}
      >
        <Trash size={16} aria-hidden />
        <span>Delete</span>
      </button>
    </div>
  );
}

export function SortNewestFirstButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:border-black/30 hover:text-primary active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 pointer-coarse:min-h-11 pointer-coarse:px-3"
    >
      <ArrowsDownUp size={14} aria-hidden />
      <span>Sort newest first</span>
    </button>
  );
}

export function AddEntryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Plus size={16} aria-hidden />
      <span>Add entry</span>
    </button>
  );
}

export function ClearSectionButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-black/10 disabled:hover:bg-transparent"
    >
      <Trash size={16} aria-hidden />
      <span>Clear sample data</span>
    </button>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  );
}
