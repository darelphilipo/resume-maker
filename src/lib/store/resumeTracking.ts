/**
 * Application tracking metadata lives on the saved Dexie row, not inside the
 * resume document. Keeping it out of `ResumeDocument` means JSON backups stay
 * portable resume data, while the launcher can still remember where each saved
 * copy was sent.
 */
export const RESUME_STATUSES = [
  "master",
  "draft",
  "applied",
  "interview",
  "offer",
] as const;

export type ResumeStatus = (typeof RESUME_STATUSES)[number];

/** Legacy rows saved before tracking existed read as a master resume. */
export const DEFAULT_RESUME_STATUS: ResumeStatus = "master";

export const RESUME_STATUS_LABELS: Record<ResumeStatus, string> = {
  master: "Master",
  draft: "Draft",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
};

export type ResumeStatusFilter = "all" | ResumeStatus;

type StatusCarrier = { status?: unknown };
type CompanyCarrier = { targetCompany?: unknown };

export function isResumeStatus(value: unknown): value is ResumeStatus {
  return (
    typeof value === "string" &&
    (RESUME_STATUSES as readonly string[]).includes(value)
  );
}

export function resumeStatusOf(row: StatusCarrier): ResumeStatus {
  return isResumeStatus(row.status) ? row.status : DEFAULT_RESUME_STATUS;
}

export function normalizeTargetCompany(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function resumeTargetCompany(row: CompanyCarrier): string {
  return typeof row.targetCompany === "string"
    ? normalizeTargetCompany(row.targetCompany)
    : "";
}

export function filterResumesByStatus<T extends StatusCarrier>(
  rows: readonly T[],
  filter: ResumeStatusFilter,
): T[] {
  if (filter === "all") {
    return [...rows];
  }

  return rows.filter((row) => resumeStatusOf(row) === filter);
}

export function resumeStatusCounts(
  rows: readonly StatusCarrier[],
): Record<ResumeStatus, number> {
  const counts = Object.fromEntries(
    RESUME_STATUSES.map((status) => [status, 0]),
  ) as Record<ResumeStatus, number>;

  for (const row of rows) {
    counts[resumeStatusOf(row)] += 1;
  }

  return counts;
}

/**
 * Keeps a filter chip from getting stuck on a status that no longer has any
 * rows (for example after the only Applied copy was moved to Interview).
 */
export function resolveStatusFilter(
  rows: readonly StatusCarrier[],
  filter: ResumeStatusFilter,
): ResumeStatusFilter {
  if (filter === "all") {
    return "all";
  }

  return resumeStatusCounts(rows)[filter] > 0 ? filter : "all";
}
