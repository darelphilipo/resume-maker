/**
 * Pure PDF layout reconstruction for the importer.
 *
 * PDF.js only gives us positioned text runs. This module turns them back into
 * visual lines while keeping the metadata the paste parser needs to tell a
 * heading from body copy: font weight, font size, and phrase boundaries based
 * on the document's typical body character width. It also detects a clean
 * two-column gutter so a Canva-style sidebar never interleaves with the main
 * column.
 *
 * Nothing here loads PDF.js or touches the DOM, so the layout rules stay cheap
 * to unit test.
 */

export type PdfTextItem = {
  str: string;
  transform?: readonly number[] | Float32Array;
  width?: number;
  height?: number;
  /** Resolved font name when the caller has one, otherwise PDF.js's id. */
  fontName?: string;
  hasEOL?: boolean;
};

export type PdfPhrase = {
  text: string;
  x: number;
  width: number;
  isBold: boolean;
  fontSize: number;
  fontName: string;
};

export type PdfLine = {
  /** Baseline y in PDF points, descending within its visual column. */
  y: number;
  /** Fully joined line text (phrases separated by their punctuation rules). */
  text: string;
  phrases: PdfPhrase[];
  /** Every phrase on the line uses a bold font. */
  isBoldLine: boolean;
  maxFontSize: number;
  /** Vertical distance to the previous line in the same visual column. */
  lineGap?: number;
  /** The next line continues this word or URL after a PDF line wrap. */
  joinNext?: boolean;
  /** The line opens a new page or a new visual column. */
  breakBefore?: "page" | "column";
};

type PositionedItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  isBold: boolean;
  fontSize: number;
  fontName: string;
};

type RawLine = {
  y: number;
  items: PositionedItem[];
};

/** Text items within this vertical distance belong to the same visual line. */
const LINE_Y_TOLERANCE = 2.5;
/** Horizontal gaps larger than this are treated as a word break. */
const WORD_GAP_POINTS = 1.5;
/** Fallback average character width when PDF.js does not report item width. */
export const FALLBACK_CHAR_WIDTH = 4.5;

/** Icon-font glyphs and zero-width characters PDFs leave behind. */
const DECORATIVE_GLYPHS = /[\uE000-\uF8FF\u200B-\u200D\u2060\uFEFF]/g;
/** Characters that mean "this line continues on the next line". */
const WRAP_GLYPHS = /[\u00AD\uFFFD]/g;
const TRAILING_WRAP_GLYPH = /[\u00AD\uFFFD]\s*$/;

const BOLD_FONT_NAME = /bold|semibold|demi|heavy|black/i;

/** Narrowest vertical whitespace band that can be a two-column gutter. */
const MIN_COLUMN_GUTTER = 10;
/** Each column must hold at least this share of the page's visual lines. */
const COLUMN_LINE_RATIO = 0.3;
/** Both sides need at least this many lines before a gutter is believed. */
const MIN_COLUMN_LINES_PER_SIDE = 2;
/** Left edges this close belong to the same column alignment cluster. */
const COLUMN_START_TOLERANCE = 8;

/** Punctuation that attaches to the token before it, never after a space. */
const ATTACH_TO_PREVIOUS = new Set([
  ",",
  ".",
  ";",
  ":",
  "!",
  "?",
  "%",
  ")",
  "]",
  "}",
]);
/** Opening punctuation that stays glued to the token after it. */
const ATTACH_TO_NEXT = new Set(["(", "[", "{", "/", "\\", "@"]);
/** Punctuation that separates tokens and needs a following space. */
const FORCE_SPACE_AFTER = new Set([
  ",",
  ":",
  ";",
  "|",
  ".",
  "!",
  "?",
  "%",
  ")",
  "]",
  "}",
]);
const BULLET_GLYPHS = new Set(["•", "●", "▪", "◦", "‣", "○", "■", "➢"]);

function lastChar(value: string): string {
  return value.trimEnd().slice(-1);
}

function firstChar(value: string): string {
  return value.trimStart().slice(0, 1);
}

function isBulletToken(value: string): boolean {
  const token = value.trim();
  return token === "-" || token === "*" || BULLET_GLYPHS.has(token);
}

function forcesSpaceBetweenText(previous: string, next: string): boolean {
  if (
    isBulletToken(previous) ||
    BULLET_GLYPHS.has(firstChar(next)) ||
    firstChar(next) === "|"
  ) {
    return true;
  }

  return FORCE_SPACE_AFTER.has(lastChar(previous));
}

/**
 * OpenResume-style spacing decision for two adjacent text runs. Returns `false`
 * when the next run is punctuation that belongs to the previous word, or when
 * the previous run is an opener/slash that must stay glued.
 *
 * Callers add their own visual-gap rule: this only decides whether a *space* is
 * the right separator when the two runs are distinct.
 */
export function shouldAddSpaceBetweenText(
  previousText: string,
  nextText: string,
): boolean {
  if (previousText === "" || nextText === "") {
    return false;
  }

  if (/\s$/.test(previousText) || /^\s/.test(nextText)) {
    return false;
  }

  if (
    ATTACH_TO_PREVIOUS.has(firstChar(nextText)) ||
    ATTACH_TO_NEXT.has(lastChar(previousText))
  ) {
    return false;
  }

  return true;
}

function joinTokens(previous: string, nextRaw: string, gap: number): string {
  const next = nextRaw.replace(WRAP_GLYPHS, "");

  if (previous === "") {
    return next.trimStart();
  }

  if (next.trim() === "") {
    return previous;
  }

  const nextText = next.trim();

  if (/^\s/.test(next)) {
    return `${previous} ${nextText}`;
  }

  const wantsSpace =
    forcesSpaceBetweenText(previous, nextText) ||
    (gap > WORD_GAP_POINTS && shouldAddSpaceBetweenText(previous, nextText));

  return wantsSpace ? `${previous} ${nextText}` : `${previous}${nextText}`;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripDecorativeGlyphs(value: string): string {
  return value.replace(DECORATIVE_GLYPHS, "");
}

export function isBoldFontName(fontName: string): boolean {
  return BOLD_FONT_NAME.test(fontName);
}

export function fontSizeFromTransform(
  transform?: readonly number[] | Float32Array,
): number {
  if (!transform || transform.length < 2) {
    return 0;
  }

  const size = Math.hypot(transform[0], transform[1]);

  return Number.isFinite(size) ? Math.abs(size) : 0;
}

export function fontSizeFromItem(
  item: Pick<PdfTextItem, "transform" | "height">,
): number {
  const transformed = fontSizeFromTransform(item.transform);

  if (transformed > 0) {
    return transformed;
  }

  const height = item.height ?? 0;

  return Number.isFinite(height) && height > 0 ? height : 0;
}

function toPositionedItem(item: PdfTextItem): PositionedItem | null {
  if (typeof item.str !== "string") {
    return null;
  }

  const text = stripDecorativeGlyphs(item.str);

  if (text.trim() === "") {
    return null;
  }

  const transform = item.transform;
  const x = transform && transform.length >= 6 ? transform[4] : 0;
  const y = transform && transform.length >= 6 ? transform[5] : 0;
  const reportedWidth = item.width ?? 0;
  const fontName = item.fontName ?? "";

  return {
    text,
    x,
    y,
    width:
      reportedWidth > 0
        ? reportedWidth
        : collapseWhitespace(text).length * FALLBACK_CHAR_WIDTH,
    isBold: isBoldFontName(fontName),
    fontSize: fontSizeFromItem(item),
    fontName,
  };
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Average character width of the document's modal body font.
 *
 * The mode is weighted by character count so many short header runs cannot
 * outvote the body copy. Only runs in that same font name/size pair contribute,
 * which keeps a large bold name or section heading from widening the estimate.
 * OpenResume uses the same idea to decide when two runs belong to one phrase.
 */
export function computeTypicalCharWidth(items: PdfTextItem[]): number {
  const usable = items
    .map((item) => {
      const text = collapseWhitespace(stripDecorativeGlyphs(item.str));
      const width = item.width ?? 0;

      return {
        text,
        width,
        fontSize: fontSizeFromItem(item),
        fontName: item.fontName ?? "",
      };
    })
    .filter((item) => item.text.length >= 2 && item.width > 0);

  if (usable.length === 0) {
    return FALLBACK_CHAR_WIDTH;
  }

  const weights = new Map<string, number>();
  const signature = (item: (typeof usable)[number]) =>
    `${item.fontName}::${item.fontSize.toFixed(1)}`;

  for (const item of usable) {
    const key = signature(item);
    weights.set(key, (weights.get(key) ?? 0) + item.text.length);
  }

  let bodyKey = "";
  let bodyWeight = -1;

  for (const [key, weight] of weights) {
    if (weight > bodyWeight) {
      bodyKey = key;
      bodyWeight = weight;
    }
  }

  const charWidths = usable
    .filter((item) => signature(item) === bodyKey)
    .map((item) => item.width / Math.max(1, item.text.length));
  const typical = median(charWidths);

  return Number.isFinite(typical) && typical > 0
    ? typical
    : FALLBACK_CHAR_WIDTH;
}

function groupRawLines(items: PdfTextItem[]): RawLine[] {
  const positioned = items
    .map(toPositionedItem)
    .filter((item): item is PositionedItem => item !== null)
    .sort((left, right) => right.y - left.y || left.x - right.x);

  const lines: RawLine[] = [];

  for (const item of positioned) {
    const line = lines.find(
      (candidate) => Math.abs(candidate.y - item.y) <= LINE_Y_TOLERANCE,
    );

    if (line) {
      line.items.push(item);
    } else {
      lines.push({ y: item.y, items: [item] });
    }
  }

  return lines.sort((left, right) => right.y - left.y);
}

type SplitLine = {
  left: PositionedItem[];
  right: PositionedItem[];
  spans: boolean;
};

function splitLine(line: RawLine, gutter: number): SplitLine {
  const left: PositionedItem[] = [];
  const right: PositionedItem[] = [];
  let spans = false;

  for (const item of line.items) {
    const end = item.x + item.width;

    if (end <= gutter) {
      left.push(item);
    } else if (item.x >= gutter) {
      right.push(item);
    } else {
      spans = true;
    }
  }

  return { left, right, spans };
}

function largestClusterRatio(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  let best = 1;
  let windowStart = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    while (sorted[index] - sorted[windowStart] > COLUMN_START_TOLERANCE) {
      windowStart += 1;
    }

    best = Math.max(best, index - windowStart + 1);
  }

  return best / sorted.length;
}

type HorizontalBand = {
  start: number;
  end: number;
};

/** Find x ranges no text item covers (candidate column gutters). */
function coverageBands(items: PositionedItem[]): HorizontalBand[] {
  const deltas = new Map<number, number>();

  for (const item of items) {
    const end = item.x + item.width;

    if (end <= item.x) {
      continue;
    }

    deltas.set(item.x, (deltas.get(item.x) ?? 0) + 1);
    deltas.set(end, (deltas.get(end) ?? 0) - 1);
  }

  const points = [...deltas.keys()].sort((left, right) => left - right);
  const bands: HorizontalBand[] = [];
  let coverage = 0;

  for (let index = 0; index < points.length; index += 1) {
    const x = points[index];
    coverage += deltas.get(x) ?? 0;
    const next = points[index + 1];

    if (
      coverage === 0 &&
      next !== undefined &&
      next - x >= MIN_COLUMN_GUTTER
    ) {
      bands.push({ start: x, end: next });
    }
  }

  return bands;
}

/**
 * Candidate gutter midpoints. A full-width banner can cover the gutter at the
 * top of the page, so empty vertical bands alone are not enough: also try the
 * space between every item's right edge and the next item start.
 */
function candidateGutters(
  lines: RawLine[],
  items: PositionedItem[],
): number[] {
  const candidates = new Set<number>();

  for (const band of coverageBands(items)) {
    candidates.add((band.start + band.end) / 2);
  }

  const starts = items
    .map((item) => item.x)
    .sort((left, right) => left - right);

  for (const item of items) {
    const end = item.x + item.width;
    const nextStart = starts.find((start) => start >= end + MIN_COLUMN_GUTTER);

    if (nextStart !== undefined) {
      candidates.add((end + nextStart) / 2);
    }
  }

  for (const line of lines) {
    const sorted = [...line.items].sort((left, right) => left.x - right.x);

    for (let index = 1; index < sorted.length; index += 1) {
      const previousEnd = sorted[index - 1].x + sorted[index - 1].width;
      const gap = sorted[index].x - previousEnd;

      if (gap >= MIN_COLUMN_GUTTER) {
        candidates.add((previousEnd + sorted[index].x) / 2);
      }
    }
  }

  return [...candidates];
}

/**
 * Detect a consistent vertical gutter that splits the page into a left and a
 * right column. Both sides must hold a meaningful share of the page's lines and
 * start at a stable left edge, which keeps a single-column resume's right-aligned
 * dates from being mistaken for a second column.
 */
function detectColumnGutter(lines: RawLine[]): number | null {
  if (lines.length < MIN_COLUMN_LINES_PER_SIDE * 2) {
    return null;
  }

  const items = lines.flatMap((line) => line.items);
  const minimumSideLines = Math.max(
    MIN_COLUMN_LINES_PER_SIDE,
    Math.ceil(lines.length * COLUMN_LINE_RATIO),
  );
  let best: { gutter: number; score: number } | null = null;

  for (const gutter of candidateGutters(lines, items)) {
    let leftLines = 0;
    let rightLines = 0;
    let columnLines = 0;
    const leftStarts: number[] = [];
    const rightStarts: number[] = [];
    const rightEnds: number[] = [];

    for (const line of lines) {
      const { left, right, spans } = splitLine(line, gutter);

      if (spans) {
        continue;
      }

      if (left.length > 0) {
        leftLines += 1;
        leftStarts.push(Math.min(...left.map((item) => item.x)));
      }

      if (right.length > 0) {
        rightLines += 1;
        rightStarts.push(Math.min(...right.map((item) => item.x)));
        rightEnds.push(Math.max(...right.map((item) => item.x + item.width)));
      }

      if (left.length > 0 || right.length > 0) {
        columnLines += 1;
      }
    }

    if (leftLines < minimumSideLines || rightLines < minimumSideLines) {
      continue;
    }

    if (columnLines < Math.ceil(lines.length * COLUMN_LINE_RATIO)) {
      continue;
    }

    const leftStartRatio = largestClusterRatio(leftStarts);
    const rightStartRatio = largestClusterRatio(rightStarts);
    const rightEndRatio = largestClusterRatio(rightEnds);

    if (leftStartRatio < 0.5 || rightStartRatio < 0.5) {
      continue;
    }

    // Right-aligned dates share a right edge while their starts wander. A real
    // second column shares a left edge, so reject "columns" that are really a
    // single-column resume with right-aligned dates.
    if (rightStartRatio < rightEndRatio) {
      continue;
    }

    const score =
      Math.min(leftLines, rightLines) * 1000 + columnLines * 10 + gutter;

    if (best === null || score > best.score) {
      best = { gutter, score };
    }
  }

  return best?.gutter ?? null;
}

function toPdfLine(raw: RawLine, typicalCharWidth: number): PdfLine | null {
  const sorted = [...raw.items].sort((left, right) => left.x - right.x);
  const phrases: PdfPhrase[] = [];
  let current: PdfPhrase | null = null;
  let previousEnd = 0;

  for (const item of sorted) {
    const gap = item.x - previousEnd;
    const startsPhrase = current === null || gap > typicalCharWidth;

    if (startsPhrase) {
      if (current) {
        phrases.push(current);
      }

      current = {
        text: item.text,
        x: item.x,
        width: item.width,
        isBold: item.isBold,
        fontSize: item.fontSize,
        fontName: item.fontName,
      };
    } else if (current) {
      current.text = joinTokens(current.text, item.text, gap);
      current.width = Math.max(
        current.width,
        item.x + item.width - current.x,
      );
      current.isBold = current.isBold && item.isBold;
      current.fontSize = Math.max(current.fontSize, item.fontSize);
    }

    previousEnd = Math.max(previousEnd, item.x + item.width);
  }

  if (current) {
    phrases.push(current);
  }

  if (phrases.length === 0) {
    return null;
  }

  const cleanedPhrases: PdfPhrase[] = [];

  for (const phrase of phrases) {
    const text = collapseWhitespace(phrase.text.replace(WRAP_GLYPHS, ""));

    if (text === "") {
      continue;
    }

    cleanedPhrases.push({ ...phrase, text });
  }

  if (cleanedPhrases.length === 0) {
    return null;
  }

  let text = "";
  let phraseEnd = 0;

  for (const phrase of cleanedPhrases) {
    text = joinTokens(text, phrase.text, phrase.x - phraseEnd);
    phraseEnd = phrase.x + phrase.width;
  }

  const lastRawItem = sorted[sorted.length - 1];
  const joinNext =
    typeof lastRawItem?.text === "string" &&
    TRAILING_WRAP_GLYPH.test(lastRawItem.text);

  return {
    y: raw.y,
    text,
    phrases: cleanedPhrases,
    isBoldLine: cleanedPhrases.every((phrase) => phrase.isBold),
    maxFontSize: Math.max(...cleanedPhrases.map((phrase) => phrase.fontSize)),
    joinNext,
  };
}

function withLineGaps(lines: PdfLine[]): PdfLine[] {
  return lines.map((line, index) => {
    if (index === 0) {
      return line;
    }

    const gap = lines[index - 1].y - line.y;

    if (!Number.isFinite(gap) || gap <= 0) {
      return line;
    }

    return { ...line, lineGap: gap };
  });
}

function toPdfLines(rawLines: RawLine[], typicalCharWidth: number): PdfLine[] {
  return rawLines
    .map((line) => toPdfLine(line, typicalCharWidth))
    .filter((line): line is PdfLine => line !== null);
}

/**
 * Turn one page's items into visual-column groups. A single-column page returns
 * one group. A two-column page returns the full-width banner first, then the
 * left column, then the right column, so a sidebar never interleaves with the
 * main body. Each group is a top-to-bottom sequence of lines.
 */
export function layoutPdfPage(items: PdfTextItem[]): PdfLine[][] {
  const rawLines = groupRawLines(items);

  if (rawLines.length === 0) {
    return [];
  }

  const typicalCharWidth = computeTypicalCharWidth(items);
  const gutter = detectColumnGutter(rawLines);

  if (gutter === null) {
    return [withLineGaps(toPdfLines(rawLines, typicalCharWidth))];
  }

  const banner: RawLine[] = [];
  const left: RawLine[] = [];
  const right: RawLine[] = [];

  for (const line of rawLines) {
    const {
      left: leftItems,
      right: rightItems,
      spans,
    } = splitLine(line, gutter);

    if (spans) {
      banner.push(line);
      continue;
    }

    if (leftItems.length > 0) {
      left.push({ y: line.y, items: leftItems });
    }

    if (rightItems.length > 0) {
      right.push({ y: line.y, items: rightItems });
    }
  }

  const groups = [
    withLineGaps(toPdfLines(banner, typicalCharWidth)),
    withLineGaps(toPdfLines(left, typicalCharWidth)),
    withLineGaps(toPdfLines(right, typicalCharWidth)),
  ].filter((group) => group.length > 0);

  return groups.length > 1
    ? groups
    : [withLineGaps(toPdfLines(rawLines, typicalCharWidth))];
}

/**
 * Layout every page and flatten it into the reading order used by the importer.
 * The first line of each later page carries `breakBefore: "page"`, and the first
 * line of every later column carries `breakBefore: "column"`, so a consumer can
 * still tell where one visual block ends.
 */
export function layoutPdfPages(pages: PdfTextItem[][]): PdfLine[][] {
  const groups: PdfLine[][] = [];

  pages.forEach((items, pageIndex) => {
    const pageGroups = layoutPdfPage(items);

    pageGroups.forEach((group, groupIndex) => {
      if (group.length === 0) {
        return;
      }

      const first = group[0];
      const annotated: PdfLine =
        pageIndex > 0 && groupIndex === 0
          ? { ...first, breakBefore: "page" }
          : groupIndex > 0
            ? { ...first, breakBefore: "column" }
            : first;

      groups.push([annotated, ...group.slice(1)]);
    });
  });

  return groups;
}

export function flattenPdfLines(groups: PdfLine[][]): PdfLine[] {
  return groups.flat();
}

/**
 * Rejoin words and URLs that a soft hyphen or replacement glyph split across a
 * line wrap. Phrases are appended so downstream consumers keep the metadata.
 */
export function mergeWrappedPdfLines(lines: PdfLine[]): PdfLine[] {
  const merged: PdfLine[] = [];

  for (const line of lines) {
    const previous = merged[merged.length - 1];

    if (previous?.joinNext) {
      merged[merged.length - 1] = {
        ...previous,
        text: collapseWhitespace(`${previous.text}${line.text}`),
        phrases: [...previous.phrases, ...line.phrases],
        isBoldLine: previous.isBoldLine && line.isBoldLine,
        maxFontSize: Math.max(previous.maxFontSize, line.maxFontSize),
        joinNext: line.joinNext,
      };
    } else {
      merged.push({ ...line });
    }
  }

  return merged;
}
