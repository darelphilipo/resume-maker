"use client";

import { CaretDown, DotsThreeVertical } from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { trackEvent } from "@/lib/analytics/trackEvent";
import { clearSampleData } from "@/lib/presets/clearSampleData";
import { serializeJsonResume } from "@/lib/schema/jsonResume";
import { serializeResume } from "@/lib/schema/serialize";
import { useResumeStore } from "@/lib/store/useResumeStore";

export function slugFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "resume";
}

function downloadJson(text: string, fileName: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportJsonButton() {
  const doc = useResumeStore((state) => state.doc);
  const patchDoc = useResumeStore((state) => state.patchDoc);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleExport(format: "backup" | "jsonresume") {
    trackEvent("json_export", { format });
    const fileName = `${slugFileName(doc.basics.name)}-resume.json`;

    if (format === "jsonresume") {
      downloadJson(
        serializeJsonResume(doc),
        `${slugFileName(doc.basics.name)}-json-resume.json`,
      );
    } else {
      downloadJson(serializeResume(doc), fileName);
    }

    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleClearSampleData() {
    // One store patch means one Zundo step: Undo restores every sample entry
    // together instead of asking the user to undo section after section.
    patchDoc(clearSampleData(doc));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
    );

    if (buttons.length === 0) {
      return;
    }

    event.preventDefault();

    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = (current + step + buttons.length) % buttons.length;

    buttons[next]?.focus();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Export & options"
        title="Export & options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "export-json-menu" : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 min-w-10 shrink-0 items-center justify-center gap-1 rounded-lg border border-transparent px-2 text-muted transition-colors hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:min-w-11 lg:gap-1.5 lg:px-3"
      >
        <DotsThreeVertical
          size={20}
          weight="bold"
          aria-hidden
          data-export-dots=""
          className="lg:hidden"
        />
        <span className="hidden items-center gap-1 text-xs font-medium lg:inline-flex">
          Export
          <CaretDown
            size={10}
            weight="bold"
            aria-hidden
            data-export-chevron=""
          />
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          id="export-json-menu"
          role="menu"
          aria-label="Export & options"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-30 mt-1 flex w-64 max-w-[calc(100vw-1rem)] flex-col gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("backup")}
            className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none"
          >
            <span className="text-sm font-medium text-text">
              Download backup (.json)
            </span>
            <span className="text-xs leading-snug text-muted">
              Everything: layout, design, and hidden entries.
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport("jsonresume")}
            className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none"
          >
            <span className="text-sm font-medium text-text">
              Export JSON Resume
            </span>
            <span className="text-xs leading-snug text-muted">
              Portable standard format for other resume tools.
            </span>
          </button>

          {doc.metadata.sampleData === true ? (
            <>
              <div
                role="separator"
                data-export-divider=""
                className="my-1 h-px bg-line"
              />
              <button
                type="button"
                role="menuitem"
                data-clear-sample-data=""
                onClick={handleClearSampleData}
                className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/5 focus-visible:bg-black/5 focus-visible:outline-none"
              >
                <span className="text-sm font-medium text-text">
                  Clear sample data
                </span>
                <span className="text-xs leading-snug text-muted">
                  Start from an empty resume. Undo brings the sample back.
                </span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
