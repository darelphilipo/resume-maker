"use client";

import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import {
  formatMonth,
  parseMonthInput,
  toMonthValue,
} from "@/lib/date/month";

const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text caret-primary transition-colors placeholder:text-muted placeholder:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-surface-muted disabled:text-muted";

const ACTION_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-line disabled:hover:bg-transparent";

export type TextInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "url" | "month";
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={type === "month" ? toMonthValue(value) : value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={INPUT_CLASS}
      />
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
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
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-surface-muted p-3">
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
};

export function EntryActions({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
}: EntryActionsProps) {
  const [confirming, setConfirming] = useState(false);
  const entryNumber = index + 1;

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
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        aria-label={`Move up entry ${entryNumber}`}
        disabled={index === 0}
        onClick={onMoveUp}
        className={ACTION_BUTTON_CLASS}
      >
        <ArrowUp size={16} aria-hidden />
        <span>Up</span>
      </button>
      <button
        type="button"
        aria-label={`Move down entry ${entryNumber}`}
        disabled={index === total - 1}
        onClick={onMoveDown}
        className={ACTION_BUTTON_CLASS}
      >
        <ArrowDown size={16} aria-hidden />
        <span>Down</span>
      </button>
      <button
        type="button"
        aria-label={`Delete entry ${entryNumber}`}
        onClick={() => setConfirming(true)}
        className={ACTION_BUTTON_CLASS}
      >
        <Trash size={16} aria-hidden />
        <span>Delete</span>
      </button>
    </div>
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
