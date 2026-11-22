import { HEADER_BLOCK_ID } from "./constants";

/**
 * A page is still a flat list of string ids (see `packPages`). Atomic sections
 * keep their plain section id; splittable sections emit one id per entry so an
 * entry — not the whole section — becomes the unit that packing can break
 * between pages.
 *
 * Encoding entry ids as strings keeps `pages: string[][]` (and therefore every
 * template prop, the print portal and the canvas frame math) unchanged. The
 * first entry of a section also carries the heading, which implements
 * keep-with-next by construction: the heading can never be stranded on a page
 * without its first entry.
 */
export const ENTRY_BLOCK_PREFIX = "__entry:";

export type DecodedBlock =
  | { kind: "header" }
  | {
      kind: "section";
      sectionId: string;
      /** `null` means "the whole section" (a plain, atomic section id). */
      entryIds: string[] | null;
      withHeading: boolean;
    }
  | { kind: "unknown" };

export function encodeEntryBlock(
  sectionId: string,
  entryId: string,
  withHeading: boolean,
): string {
  return encodeEntryGroup(sectionId, [entryId], withHeading);
}

/**
 * Several entries that must stay in one packing block (a grouped promotion at
 * one company). `encodeURIComponent` escapes commas inside ids, so the comma is
 * a safe separator. A single-entry group produces the same string as
 * `encodeEntryBlock` did before grouping existed.
 */
export function encodeEntryGroup(
  sectionId: string,
  entryIds: readonly string[],
  withHeading: boolean,
): string {
  const encodedIds = entryIds.map((entryId) => encodeURIComponent(entryId));

  return `${ENTRY_BLOCK_PREFIX}${encodeURIComponent(sectionId)}:${encodedIds.join(",")}:${withHeading ? "1" : "0"}`;
}

export function decodeBlock(id: string): DecodedBlock {
  if (id === HEADER_BLOCK_ID) {
    return { kind: "header" };
  }

  if (!id.startsWith(ENTRY_BLOCK_PREFIX)) {
    return {
      kind: "section",
      sectionId: id,
      entryIds: null,
      withHeading: true,
    };
  }

  const parts = id.slice(ENTRY_BLOCK_PREFIX.length).split(":");

  if (
    parts.length !== 3 ||
    parts[0] === "" ||
    parts[1] === "" ||
    (parts[2] !== "0" && parts[2] !== "1")
  ) {
    return { kind: "unknown" };
  }

  try {
    const entryIds = parts[1]
      .split(",")
      .filter((entryId) => entryId !== "")
      .map((entryId) => decodeURIComponent(entryId));

    if (entryIds.length === 0) {
      return { kind: "unknown" };
    }

    return {
      kind: "section",
      sectionId: decodeURIComponent(parts[0]),
      entryIds,
      withHeading: parts[2] === "1",
    };
  } catch {
    return { kind: "unknown" };
  }
}
