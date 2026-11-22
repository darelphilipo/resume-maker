import { toMonthValue } from "./month";

/** Anything with an optional date range; Experience/Education also pass `current`. */
export type DateSortableEntry = {
  startDate?: string;
  endDate?: string;
  current?: boolean;
};

const PRESENT_PATTERN = /^present$/i;

/** An open-ended role is "Present" either through the toggle or the word. */
export function isPresentEntry(item: DateSortableEntry): boolean {
  if (item.current === true) {
    return true;
  }

  return PRESENT_PATTERN.test((item.endDate ?? "").trim());
}

function sortableMonth(value: string | undefined): string {
  return value ? toMonthValue(value) : "";
}

function isUndatedEntry(item: DateSortableEntry): boolean {
  return (
    !isPresentEntry(item) &&
    sortableMonth(item.startDate) === "" &&
    sortableMonth(item.endDate) === ""
  );
}

/**
 * The month an entry should be ranked by: its end month, or its start month
 * when no end is recorded yet. A role that started in 2024 with no end date is
 * more recent than one that ended in 2020.
 */
function rankingMonth(item: DateSortableEntry): string {
  const end = sortableMonth(item.endDate);

  return end !== "" ? end : sortableMonth(item.startDate);
}

/** Descending month comparison where a blank date sorts below any real month. */
function compareMonthDescending(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a === "") {
    return 1;
  }

  if (b === "") {
    return -1;
  }

  return a > b ? -1 : 1;
}

/**
 * Orders dated entries the way a recruiter reads them: current roles first,
 * then the latest end month, then the latest start month, with entries that
 * have no dates at all kept at the bottom. Ties keep their existing order so a
 * second tap never shuffles equal entries.
 */
export function sortEntriesNewestFirst<T extends DateSortableEntry>(
  items: readonly T[],
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const presentDifference =
        Number(isPresentEntry(b.item)) - Number(isPresentEntry(a.item));

      if (presentDifference !== 0) {
        return presentDifference;
      }

      const undatedDifference =
        Number(isUndatedEntry(a.item)) - Number(isUndatedEntry(b.item));

      if (undatedDifference !== 0) {
        return undatedDifference;
      }

      const endDifference = compareMonthDescending(
        rankingMonth(a.item),
        rankingMonth(b.item),
      );

      if (endDifference !== 0) {
        return endDifference;
      }

      const startDifference = compareMonthDescending(
        sortableMonth(a.item.startDate),
        sortableMonth(b.item.startDate),
      );

      if (startDifference !== 0) {
        return startDifference;
      }

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/** True when the entries already read newest-first, so the button can hide. */
export function isNewestFirst(items: readonly DateSortableEntry[]): boolean {
  const sorted = sortEntriesNewestFirst(items);

  return sorted.every((item, index) => item === items[index]);
}

/**
 * Plain-language date sanity check for an end date that sits before its start.
 * Current roles and blank/incomplete ranges are left alone because the picker
 * is disabled or there is nothing to compare yet.
 */
export function dateRangeWarning(
  startDate: string,
  endDate: string,
  current = false,
): string | null {
  if (current || isPresentEntry({ startDate, endDate })) {
    return null;
  }

  const start = toMonthValue(startDate);
  const end = toMonthValue(endDate);

  if (start === "" || end === "") {
    return null;
  }

  return end < start ? "End date is earlier than start date" : null;
}
