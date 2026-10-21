"use client";

import { Eye, Palette, TextAa } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export type EditorTab = "content" | "design" | "preview";

type TabDefinition = {
  id: EditorTab;
  label: string;
  Icon: Icon;
};

const TABS: readonly TabDefinition[] = [
  { id: "content", label: "Content", Icon: TextAa },
  { id: "design", label: "Design", Icon: Palette },
  { id: "preview", label: "Preview", Icon: Eye },
];

export type MobileBottomNavProps = {
  activeTab: EditorTab;
  onChange: (tab: EditorTab) => void;
};

export function MobileBottomNav({
  activeTab,
  onChange,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Editor panels"
      className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div role="tablist" aria-label="Editor panels" className="grid grid-cols-3">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={isActive}
              aria-controls={`panel-${id}`}
              onClick={() => onChange(id)}
              className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? "text-primary"
                  : "text-text/60 hover:text-text active:bg-black/5"
              }`}
            >
              <Icon size={20} aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
