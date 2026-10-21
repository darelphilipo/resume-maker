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

export function formatMonth(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "") {
    return "";
  }

  const match = /^(\d{4})-(\d{1,2})$/.exec(trimmed);

  if (!match) {
    return value;
  }

  const year = match[1];
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return value;
  }

  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function DateRange({
  start,
  end,
  current = false,
}: {
  start: string;
  end: string;
  current?: boolean;
}) {
  if (start.trim() === "" && end.trim() === "") {
    return null;
  }

  const startLabel = formatMonth(start);
  const endLabel = current ? "Present" : formatMonth(end);
  const parts = [startLabel, endLabel].filter((part) => part !== "");

  if (parts.length === 0) {
    return null;
  }

  return <span className="resume-date-range">{parts.join(" — ")}</span>;
}
