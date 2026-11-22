"use client";

import { useEffect, useState } from "react";

/** Matches the `lg` breakpoint used by the editor's responsive shell. */
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

/**
 * Mobile-first viewport check. It starts `false` on the server and on the first
 * client render (so hydration agrees with the mobile layout), then syncs to the
 * real media query in an effect. Short dialogs use it to pick a centred modal
 * on desktop and keep the native bottom sheet on phones.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const sync = (): void => {
      setIsDesktop(query.matches);
    };

    sync();
    query.addEventListener("change", sync);

    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  return isDesktop;
}
