"use client";

import { X } from "@phosphor-icons/react";
import { Drawer } from "vaul";
import type { ReactNode } from "react";

import { useVisualViewportOffset } from "./useVisualViewportOffset";

export type EntryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /**
   * Optional trigger rendered inside `Drawer.Root`. vaul owns its click and
   * ARIA wiring (`aria-haspopup`/`aria-expanded`/`aria-controls`) so the portal
   * opens reliably from the same element on desktop and touch.
   */
  trigger?: ReactNode;
};

export function EntryDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
}: EntryDrawerProps) {
  const viewportOffset = useVisualViewportOffset();

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.6, 0.95]}
    >
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          style={{ bottom: viewportOffset }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[95dvh] flex-col rounded-t-2xl border-t border-line bg-surface text-text shadow-xl outline-none"
        >
          <div
            aria-hidden
            className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/20"
          />
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-3">
            <Drawer.Title className="min-w-0 flex-1 font-serif text-lg font-semibold tracking-tight">
              {title}
            </Drawer.Title>
            <button
              type="button"
              aria-label="Close drawer"
              onClick={() => onOpenChange(false)}
              className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-2">
            <Drawer.Description
              className={description ? "text-sm text-muted" : "sr-only"}
            >
              {description ?? title}
            </Drawer.Description>
            <div className="mt-4">{children}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
