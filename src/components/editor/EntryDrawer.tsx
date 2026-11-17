"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";

import { useVisualViewportOffset } from "./useVisualViewportOffset";

export type EntryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

export function EntryDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: EntryDrawerProps) {
  const viewportOffset = useVisualViewportOffset();

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.6, 0.95]}
    >
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
            <Drawer.Title className="font-serif text-lg font-semibold tracking-tight">
              {title}
            </Drawer.Title>
            <Drawer.Description
              className={description ? "mt-1 text-sm text-muted" : "sr-only"}
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
