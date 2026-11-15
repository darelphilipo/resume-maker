import { formatMonth } from "@/lib/date/month";

export { formatMonth };

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
