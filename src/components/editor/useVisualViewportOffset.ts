"use client";

import { useEffect, useState } from "react";

export function useVisualViewportOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const viewport =
      typeof window === "undefined" ? null : window.visualViewport;

    if (!viewport) {
      return;
    }

    const update = (): void => {
      setOffset(
        Math.max(
          0,
          window.innerHeight - viewport.height - viewport.offsetTop,
        ),
      );
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}
