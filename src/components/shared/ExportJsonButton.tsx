"use client";

import { DownloadSimple } from "@phosphor-icons/react";

import { serializeResume } from "@/lib/schema/serialize";
import { useResumeStore } from "@/lib/store/useResumeStore";

export function slugFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "resume";
}

export function ExportJsonButton() {
  const doc = useResumeStore((state) => state.doc);

  function handleDownload() {
    const blob = new Blob([serializeResume(doc)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${slugFileName(doc.basics.name)}-resume.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      aria-label="Download JSON backup"
      onClick={handleDownload}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-medium transition-colors hover:border-black/30 active:bg-black/5"
    >
      <DownloadSimple size={16} aria-hidden />
      <span className="sm:hidden">JSON</span>
      <span className="hidden sm:inline">Download JSON backup</span>
    </button>
  );
}
