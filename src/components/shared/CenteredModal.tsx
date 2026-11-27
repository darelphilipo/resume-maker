"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A viewport-centred modal used by the short, non-form dialogs in the editor
 * (Trim tips, Tidy bullets, the desktop Match JD sheet).
 *
 * It is portalled to `document.body` and centred with flexbox, so a trigger in
 * the narrow left Content column can never drag a 20rem panel off the left
 * viewport edge the way an `absolute right-0` popover did. Backdrop taps, the
 * close button supplied by the caller, and Escape all dismiss it. No server
 * dependency: the portal only mounts after the client opens the dialog.
 */
export function CenteredModal({
  open,
  onClose,
  titleId,
  children,
  contentClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  contentClassName?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      data-centered-modal=""
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
        className={`max-h-[70vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-4 text-left text-text shadow-xl ${contentClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
