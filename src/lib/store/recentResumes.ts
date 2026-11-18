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
