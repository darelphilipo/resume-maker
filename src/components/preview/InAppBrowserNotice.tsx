"use client";

import { Copy, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { ExportJsonButton } from "@/components/shared/ExportJsonButton";
import {
  detectInAppBrowser,
  type InAppBrowserInfo,
} from "@/lib/print/detectInAppBrowser";

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-10000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();
  return copied;
}

export function InAppBrowserNotice() {
  const [info, setInfo] = useState<InAppBrowserInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    void Promise.resolve().then(() => {
      if (active) {
        setInfo(detectInAppBrowser(navigator.userAgent));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleCopyLink(): Promise<void> {
    const url = window.location.href;
    let copiedNow = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        copiedNow = true;
      }
    } catch {
      copiedNow = false;
    }

    if (!copiedNow) {
      copiedNow = legacyCopy(url);
    }

    if (copiedNow) {
      setCopied(true);
    }
  }

  if (!info?.inApp || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className="editor-chrome border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-start gap-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            This {info.app ?? "in-app"} browser may not open the print dialog.
          </p>
          <p className="mt-1 opacity-80">
            For a reliable PDF, open this page in Safari or Chrome first. You
            can also save a JSON backup so no work is lost.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-900/20 px-3 py-2 text-sm font-medium transition-colors hover:border-amber-900/40 active:bg-amber-900/5"
          >
            <Copy size={16} aria-hidden />
            Copy link
          </button>
          <span aria-live="polite" className="text-sm font-medium">
            {copied ? "Copied" : ""}
          </span>
          <ExportJsonButton />
          <button
            type="button"
            aria-label="Dismiss browser warning"
            onClick={() => {
              setDismissed(true);
            }}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-amber-900/20 transition-colors hover:border-amber-900/40 active:bg-amber-900/5"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
