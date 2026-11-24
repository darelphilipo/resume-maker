/**
 * Bullet-boundary slicing for pagination.
 *
 * An entry is normally an atomic packing block. When a single entry is taller
 * than the page (or taller than the space left on Page 1), pagination splits it
 * into its bullets so the first page is filled instead of leaving a blank gap
 * and clipping the entry in print. These helpers keep that split deterministic
 * and string-based: no DOM parser, so they work during static rendering too.
 *
 * Only a rich-text field with exactly one top-level list is splittable. Multiple
 * lists (or list content mixed with prose) stay atomic because dropping the
 * content between the lists would lose prose.
 */

export type EntryBulletSlices = {
  /** HTML before the list (for example a leading paragraph). */
  prefix: string;
  /** HTML after the list (for example a trailing paragraph). */
  suffix: string;
  /** The original opening list tag, e.g. `<ul>` or `<ol class="x">`. */
  openTag: string;
  closeTag: string;
  /** Full `<li>…</li>` markup for every non-empty top-level bullet. */
  bullets: string[];
};

type ListBlock = {
  start: number;
  end: number;
  openTag: string;
  closeTag: string;
  inner: string;
};

type ListItemSpan = {
  start: number;
  end: number;
  innerStart: number;
  innerEnd: number;
};

const LIST_TAG_PATTERN = /<(\/?)(ul|ol)\b[^>]*>/gi;
const LI_TAG_PATTERN = /<\/?li\b[^>]*>/gi;

function findListItemSpans(html: string): ListItemSpan[] {
  const spans: ListItemSpan[] = [];
  const pattern = new RegExp(LI_TAG_PATTERN.source, LI_TAG_PATTERN.flags);
  let depth = 0;
  let start = 0;
  let innerStart = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const tag = match[0];

    if (tag.startsWith("</")) {
      if (depth === 0) {
        continue;
      }

      depth -= 1;

      if (depth === 0) {
        spans.push({
          start,
          end: match.index + tag.length,
          innerStart,
          innerEnd: match.index,
        });
      }

      continue;
    }

    if (depth === 0) {
      start = match.index;
      innerStart = match.index + tag.length;
    }

    depth += 1;
  }

  return spans;
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Top-level list blocks. A list nested inside another list is part of its
 * parent's markup, so only depth-zero `<ul>`/`<ol>` pairs become blocks.
 */
function findListBlocks(html: string): ListBlock[] | null {
  const blocks: ListBlock[] = [];
  const pattern = new RegExp(LIST_TAG_PATTERN.source, LIST_TAG_PATTERN.flags);
  let depth = 0;
  let start = 0;
  let openTag = "";
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const tag = match[0];
    const closing = match[1] === "/";

    if (!closing) {
      if (depth === 0) {
        start = match.index;
        openTag = tag;
      }

      depth += 1;
      continue;
    }

    if (depth === 0) {
      continue;
    }

    depth -= 1;

    if (depth === 0) {
      const end = match.index + tag.length;
      const innerStart = start + openTag.length;

      blocks.push({
        start,
        end,
        openTag,
        closeTag: tag,
        inner: html.slice(innerStart, match.index),
      });
    }
  }

  // An unclosed list cannot be sliced safely; keep the entry atomic instead.
  return depth === 0 ? blocks : null;
}

/**
 * Parses a rich-text field for bullet splitting. Returns `null` unless there
 * is exactly one top-level list with at least two non-empty bullets.
 */
export function parseEntryBulletSlices(
  html: string,
): EntryBulletSlices | null {
  const trimmed = html.trim();

  if (trimmed === "") {
    return null;
  }

  const blocks = findListBlocks(trimmed);

  if (!blocks || blocks.length !== 1) {
    return null;
  }

  const [list] = blocks;
  const bullets = findListItemSpans(list.inner)
    .map((span) => list.inner.slice(span.start, span.end))
    .filter((bullet) => plainText(bullet) !== "");

  if (bullets.length < 2) {
    return null;
  }

  return {
    prefix: trimmed.slice(0, list.start),
    suffix: trimmed.slice(list.end),
    openTag: list.openTag,
    closeTag: list.closeTag,
    bullets,
  };
}

export function countEntryBullets(html: string): number {
  return parseEntryBulletSlices(html)?.bullets.length ?? 0;
}

/**
 * Renders the inclusive bullet range `[start, end]`. The prefix travels with
 * the first fragment and the suffix with the last, so prose before/after the
 * list is printed exactly once across all pages.
 */
export function sliceEntryBullets(
  slices: EntryBulletSlices,
  start: number,
  end: number,
): string {
  const lastIndex = slices.bullets.length - 1;
  const from = Math.max(0, Math.min(Math.trunc(start), lastIndex));
  const to = Math.max(from, Math.min(Math.trunc(end), lastIndex));

  if (slices.bullets.length === 0) {
    return "";
  }

  return [
    from === 0 ? slices.prefix : "",
    slices.openTag,
    slices.bullets.slice(from, to + 1).join(""),
    slices.closeTag,
    to === lastIndex ? slices.suffix : "",
  ].join("");
}
