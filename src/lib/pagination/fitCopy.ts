import { MIN_FIT_SCALE } from "./fitScale";
import type { FitBlockedReason } from "./usePageLayout";

/** The shortest honest label for the readable fit floor ("Min 78%"). */
export const MIN_FIT_LABEL = `Min ${Math.round(MIN_FIT_SCALE * 100)}%`;

/**
 * Why a fit is unavailable, in the same plain language the preview uses.
 *
 * The compact preview pill only has room for `Min 78%`; the full sentence lives
 * in its `title` and screen-reader copy, and in the Review dialog where there is
 * a whole row for it. Keep both surfaces reading from this one map.
 */
export const FIT_BLOCKED_COPY: Record<FitBlockedReason, string> = {
  "page-break":
    "A section is set to start on a new page, so this can't fit on one page.",
  "too-tall": `Too tall to fit on one page above ${Math.round(
    MIN_FIT_SCALE * 100,
  )}% — trim a line or two.`,
};

export function fitBlockedCopy(reason: FitBlockedReason): string {
  return FIT_BLOCKED_COPY[reason];
}
