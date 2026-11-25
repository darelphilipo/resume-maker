import type { FitBlockedReason } from "./usePageLayout";

/**
 * Why a fit is unavailable, in plain language.
 *
 * The Preview bar now shows only the page count when no readable fit exists;
 * this sentence lives under the disabled `Fit to 1 Page` control in Review, so
 * it can stay clear without clipping the bar at 390px.
 */
export const FIT_BLOCKED_COPY: Record<FitBlockedReason, string> = {
  "page-break":
    "A section is set to start on a new page, so this can't fit on one page.",
  "too-tall":
    "Too long to shrink to 1 page cleanly — trim a few lines or try Compact density.",
};

export function fitBlockedCopy(reason: FitBlockedReason): string {
  return FIT_BLOCKED_COPY[reason];
}
