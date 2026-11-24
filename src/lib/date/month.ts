/** Oldest year a resume may print; earlier values are almost always typos. */
export const MIN_RESUME_YEAR = 1950;

/** Latest year a resume may print; later values are almost always typos. */
export const MAX_RESUME_YEAR = 2100;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function padMonth(month: number): string {
  return String(month).padStart(2, "0");
}

function monthFromName(value: string): number | null {
  const normalized = value.toLowerCase();
  const shortIndex = MONTH_NAMES.findIndex(
    (name) => name.toLowerCase() === normalized,
  );

  if (shortIndex !== -1) {
    return shortIndex + 1;
  }

  const fullIndex = FULL_MONTH_NAMES.findIndex(
    (name) => name.toLowerCase() === normalized,
  );

  if (fullIndex !== -1) {
    return fullIndex + 1;
  }

  // "Sept" is a common abbreviation that is neither the 3-letter short name
  // nor the full name.
  return normalized === "sept" ? 9 : null;
}

/**
 * True only for a complete four-digit year inside `MIN_RESUME_YEAR` and
 * `MAX_RESUME_YEAR`. Partial drafts (`20`), non-digits (`abcd`), and padded
 * extremes (`0000`, `9999`) are rejected so they can never reach the preview or
 * PDF. Kept pure so the forms share the same boundary rule.
 */
export function isResumeYearInRange(year: string): boolean {
  const trimmed = year.trim();

  if (!/^\d{4}$/.test(trimmed)) {
    return false;
  }

  const numericYear = Number(trimmed);

  return numericYear >= MIN_RESUME_YEAR && numericYear <= MAX_RESUME_YEAR;
}

/**
 * Normalizes a stored date to the canonical `YYYY-MM` form. Accepts full ISO
 * dates too (`2023-11-15`), so imported JSON Resume data keeps its month.
 * Returns `""` when the value cannot be represented as a month.
 */
export function toMonthValue(value: string): string {
  const match = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(value.trim());

  if (!match) {
    return "";
  }

  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return "";
  }

  return `${match[1]}-${padMonth(month)}`;
}

/**
 * Formats `YYYY-MM` (or an ISO date) as `Oct 2023` for compact display. A bare
 * four-digit year is a valid stored value, so it prints as `2023` rather than
 * being treated as unparseable text.
 */
export function formatMonth(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "") {
    return "";
  }

  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const monthValue = toMonthValue(trimmed);

  if (monthValue === "") {
    return value;
  }

  const [year, month] = monthValue.split("-");

  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

/**
 * Parses human input into `YYYY-MM`, or a bare `YYYY` when only a year is
 * given. Accepts `2023-10`, `2023/10`, `10/2023`, `10-2023`, `Oct 2023`,
 * `October 2023`, and `2023`. Returns `null` for input that cannot be
 * interpreted, so callers can decide how to handle invalid text.
 */
export function parseMonthInput(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return "";
  }

  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const isoValue = toMonthValue(trimmed);

  if (isoValue !== "") {
    return isoValue;
  }

  const nameMatch = /^([A-Za-z]{3,9})\.?,?\s+(\d{4})$/.exec(trimmed);

  if (nameMatch) {
    const month = monthFromName(nameMatch[1]);

    if (month === null) {
      return null;
    }

    return `${nameMatch[2]}-${padMonth(month)}`;
  }

  const numericMatch = /^(\d{1,2})\s*[/-]\s*(\d{4})$/.exec(trimmed);

  if (numericMatch) {
    const month = Number(numericMatch[1]);

    if (month < 1 || month > 12) {
      return null;
    }

    return `${numericMatch[2]}-${padMonth(month)}`;
  }

  return null;
}
