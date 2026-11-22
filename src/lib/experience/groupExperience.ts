/**
 * Grouping for Experience entries that share a company.
 *
 * A promotion path (`Engineer` → `Senior Engineer` at the same employer) reads
 * better as one company block with a single company / location / combined date
 * header and the roles stacked underneath. The rules live here so the visual
 * renderer and the pagination planner agree on where a group starts and ends.
 */

export type ExperienceItemRecord = Record<string, unknown>;

export type ExperienceDateSpan = {
  /** Earliest non-blank `startDate`, or `""`. */
  start: string;
  /** Latest non-blank `endDate`, or `""` while a role is current. */
  end: string;
  /** True when any role in the group has `current === true`. */
  current: boolean;
};

export type ExperienceGroup = {
  /** Stable render key: normalized company plus the first role's id. */
  key: string;
  /** Display company name from the first role (original casing). */
  company: string;
  /** Unique non-blank role locations, joined with `" · "`. */
  location: string;
  dateSpan: ExperienceDateSpan;
  items: ExperienceItemRecord[];
  /** Entry ids in the same order as `items`. */
  entryIds: string[];
  /** False for a single role, which keeps the normal entry layout. */
  grouped: boolean;
};

function text(item: ExperienceItemRecord, field: string): string {
  const value = item[field];
  return typeof value === "string" ? value : "";
}

function entryId(item: ExperienceItemRecord, index: number): string {
  return typeof item.id === "string" ? item.id : `item-${index}`;
}

/**
 * Compare company names the way a reader would: trim, collapse whitespace and
 * ignore case. Punctuation is kept so genuinely different names stay separate.
 */
export function normalizeCompanyName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function experienceDateSpan(
  items: readonly ExperienceItemRecord[],
): ExperienceDateSpan {
  const starts = items
    .map((item) => text(item, "startDate").trim())
    .filter((value) => value !== "")
    .sort();
  const ends = items
    .map((item) => text(item, "endDate").trim())
    .filter((value) => value !== "")
    .sort();
  const current = items.some((item) => item.current === true);

  return {
    start: starts[0] ?? "",
    // A current role keeps the span open ("Present") even if another role in
    // the group already has a recorded end date.
    end: current ? "" : (ends[ends.length - 1] ?? ""),
    current,
  };
}

function joinedLocations(items: readonly ExperienceItemRecord[]): string {
  const seen = new Set<string>();
  const locations: string[] = [];

  for (const item of items) {
    const location = text(item, "location").trim();

    if (location === "") {
      continue;
    }

    const key = location.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    locations.push(location);
  }

  return locations.join(" · ");
}

/**
 * Split entries into consecutive same-company groups. A blank company never
 * joins a neighbour (there is nothing to print in the group header), and a
 * company that appears again after a different employer starts a new group.
 * The input array is never mutated.
 */
export function groupExperienceItems(
  items: readonly ExperienceItemRecord[],
): ExperienceGroup[] {
  const buckets: {
    company: string;
    normalized: string;
    items: ExperienceItemRecord[];
    entryIds: string[];
  }[] = [];

  items.forEach((item, index) => {
    const company = text(item, "company").trim();
    const normalized = normalizeCompanyName(company);
    const last = buckets[buckets.length - 1];
    const id = entryId(item, index);

    if (normalized !== "" && last && last.normalized === normalized) {
      last.items.push(item);
      last.entryIds.push(id);
      return;
    }

    buckets.push({
      company,
      normalized,
      items: [item],
      entryIds: [id],
    });
  });

  return buckets.map((bucket) => ({
    key: `${bucket.normalized || "__blank"}:${bucket.entryIds[0]}`,
    company: bucket.company,
    location: joinedLocations(bucket.items),
    dateSpan: experienceDateSpan(bucket.items),
    items: bucket.items,
    entryIds: bucket.entryIds,
    grouped: bucket.items.length > 1,
  }));
}
