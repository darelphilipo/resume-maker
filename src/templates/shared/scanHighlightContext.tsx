"use client";

import { createContext, useContext } from "react";

/**
 * Preview-only switch for the 6-Second Recruiter Scan.
 *
 * The visual preview provider turns it on; `PrintPortal` and `MeasureLayer`
 * never do, so the exported PDF and the measured layout are always untouched.
 */
export const ScanHighlightContext = createContext(false);

export function useScanHighlight(): boolean {
  return useContext(ScanHighlightContext);
}
