"use client";

import { X } from "@phosphor-icons/react";
import { Drawer } from "vaul";
import type { ReactNode } from "react";

import { useVisualViewportOffset } from "./useVisualViewportOffset";

/** Snap points suit the tall section/entry forms; compact dialogs opt out. */
const DEFAULT_SNAP_POINTS = [0.6, 0.95];

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
  /**
   * vaul snap points for tall, scrollable drawers (default `[0.6, 0.95]`).
   * Pass `false` for a short dialog: with snap points, vaul parks the sheet at
   * 60% of the viewport by translating it down ~40%, so a short sheet ends up
   * almost entirely below the fold and looks like it never opened in a real
   * browser. jsdom has no layout/transform, which is why unit tests missed it.
   */
  snapPoints?: number[] | false;
};

export function EntryDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  snapPoints,
}: EntryDrawerProps) {
  const viewportOffset = useVisualViewportOffset();
  const resolvedSnapPoints =
    snapPoints === undefined
      ? DEFAULT_SNAP_POINTS
      : snapPoints || undefined;

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={resolvedSnapPoints}
    >
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          style={{
            bottom: viewportOffset,
            maxHeight: `calc(95dvh - ${viewportOffset}px)`,
          }}
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
              data-vaul-no-drag
              onPointerDown={(event) => {
                // Keep vaul's drag/snap handler from claiming a tap on X: a
                // pointer-down here must be a plain close click, not the first
                // step of a drag that snaps to a shorter snap point instead.
                event.stopPropagation();
              }}
              onClick={() => onOpenChange(false)}
              className="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <X size={20} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-8 pt-2">
            <Drawer.Description
              className={description ? "text-sm text-muted" : "sr-only"}
            >
              {description ?? title}
            </Drawer.Description>
            <div className="mt-4 min-w-0 overflow-x-hidden">{children}</div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
