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
  return `${ENTRY_BLOCK_PREFIX}${encodeURIComponent(sectionId)}:${encodeURIComponent(entryId)}:${withHeading ? "1" : "0"}`;
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
    return {
      kind: "section",
      sectionId: decodeURIComponent(parts[0]),
      entryIds: [decodeURIComponent(parts[1])],
      withHeading: parts[2] === "1",
    };
  } catch {
    return { kind: "unknown" };
  }
}
