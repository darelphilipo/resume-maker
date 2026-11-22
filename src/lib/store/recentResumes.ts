import type { ResumeRow } from "./db";

export const UNTITLED_RESUME = "Untitled resume";

/**
 * The launcher list labels a saved resume with the candidate name, then the
 * headline, so an imported-but-unnamed resume is still recognisable.
 */
export function recentResumeName(row: ResumeRow): string {
  const name = row.doc.basics.name.trim();

  if (name !== "") {
    return name;
  }

  const headline = row.doc.basics.headline.trim();

  if (headline !== "") {
    return headline;
  }

  return UNTITLED_RESUME;
}

const EDITED_FORMAT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function recentResumeEditedLabel(updatedAt: number): string {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
    return "Edited recently";
  }

  return `Edited ${EDITED_FORMAT.format(new Date(updatedAt))}`;
}

/** Five rows keep the home page short without hiding the pagination control. */
export const RECENT_PAGE_SIZE = 5;

/** Number of pages a filtered list needs; an empty list still has page 1. */
export function recentPageCount(total: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / RECENT_PAGE_SIZE));
}

/** Keep the current page valid after deleting rows or changing the filter. */
export function clampRecentPage(page: number, total: number): number {
  const normalized = Number.isFinite(page) ? Math.floor(page) : 1;

  return Math.min(Math.max(1, normalized), recentPageCount(total));
}

/** The rows visible on one page of the Recent resumes list. */
export function recentPageRows<T>(rows: readonly T[], page: number): T[] {
  const safePage = clampRecentPage(page, rows.length);
  const start = (safePage - 1) * RECENT_PAGE_SIZE;

  return rows.slice(start, start + RECENT_PAGE_SIZE);
}
