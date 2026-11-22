import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsDesktop } from "./useIsDesktop";

type Listener = () => void;

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

function installMatchMedia(matches: boolean) {
  let listener: Listener | null = null;

  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_: string, handler: Listener) => {
      listener = handler;
    },
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;

  return {
    setMatches(next: boolean) {
      act(() => {
        matches = next;
        listener?.();
      });
    },
  };
}

describe("useIsDesktop", () => {
  it("starts mobile-first and follows the media query", () => {
    const media = installMatchMedia(true);
    const { result } = renderHook(() => useIsDesktop());

    expect(result.current).toBe(true);

    media.setMatches(false);
    expect(result.current).toBe(false);
  });

  it("defaults to mobile when matchMedia reports no desktop match", () => {
    installMatchMedia(false);

    expect(renderHook(() => useIsDesktop()).result.current).toBe(false);
  });

  it("uses the 1024px lg breakpoint", () => {
    let observed = "";
    installMatchMedia(false);
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => {
      observed = query;
      return original(query);
    }) as unknown as typeof window.matchMedia;

    renderHook(() => useIsDesktop());

    expect(observed).toBe("(min-width: 1024px)");
  });
});
