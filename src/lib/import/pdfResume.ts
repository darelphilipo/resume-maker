/**
 * Client-side PDF import. PDF.js extracts the text items, this module rebuilds
 * readable lines from their coordinates, and `parsePastedResume` turns those
 * lines into the same `ResumeDocument` shape as the paste importer.
 *
 * PDF.js is loaded lazily so the launcher and editor bundles stay small, and
 * its worker module is imported on the main thread instead of being served as a
 * separate asset. That keeps the static export self-contained and offline-safe:
 * no CDN, no server route, and no `basePath`-sensitive worker URL.
 */

import { parsePastedResume } from "@/lib/import/pasteResume";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

export type PdfTextItem = {
  str: string;
  transform?: readonly number[] | Float32Array;
  width?: number;
  hasEOL?: boolean;
};

export type PdfResumeResult = {
  /** Reconstructed plain text, useful for distinguishing empty/scanned PDFs. */
  text: string;
  /** Parsed resume, or null when the text did not look like a resume. */
  doc: ResumeDocument | null;
};

type PositionedItem = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type RawLine = {
  y: number;
  items: PositionedItem[];
};

type PageLine = {
  y: number;
  text: string;
  /** The next line continues this word or URL after a PDF line wrap. */
  joinNext?: boolean;
};

/** Text items within this vertical distance belong to the same visual line. */
const LINE_Y_TOLERANCE = 2.5;
/** Horizontal gaps larger than this are treated as a word break. */
const WORD_GAP_POINTS = 1.5;
/** Fallback average character width when PDF.js does not report item width. */
const FALLBACK_CHAR_WIDTH = 4.5;
/** A gap this much larger than the usual line spacing starts a new paragraph. */
const PARAGRAPH_GAP_FACTOR = 1.6;
const PARAGRAPH_GAP_SLACK = 2;
/** Icon-font glyphs and zero-width characters PDFs leave behind. */
const DECORATIVE_GLYPHS = /[\uE000-\uF8FF\u200B-\u200D\u2060\uFEFF]/g;
/** Characters that mean "this line continues on the next line". */
const WRAP_GLYPHS = /[\u00AD\uFFFD]/g;
const TRAILING_WRAP_GLYPH = /[\u00AD\uFFFD]\s*$/;
/** Narrowest vertical whitespace band that can be a two-column gutter. */
const MIN_COLUMN_GUTTER = 10;
/** Each column must hold at least this share of the page's visual lines. */
const COLUMN_LINE_RATIO = 0.3;
/** Both sides need at least this many lines before a gutter is believed. */
const MIN_COLUMN_LINES_PER_SIDE = 2;
/** Left edges this close belong to the same column alignment cluster. */
const COLUMN_START_TOLERANCE = 8;

function stripDecorativeGlyphs(value: string): string {
  return value.replace(DECORATIVE_GLYPHS, "");
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

  return {
    text,
    x,
    y,
    width:
      reportedWidth > 0
        ? reportedWidth
        : text.trim().length * FALLBACK_CHAR_WIDTH,
  };
}

function buildLineText(items: PositionedItem[]): string {
  const sorted = [...items].sort((left, right) => left.x - right.x);
  let text = "";
  let previousEnd = 0;

  for (const item of sorted) {
    const raw = item.text;

    if (text === "") {
      text = raw.trimStart();
    } else {
      const gap = item.x - previousEnd;
      const needsSpace =
        gap > WORD_GAP_POINTS && !/\s$/.test(text) && !/^\s/.test(raw);

      text += needsSpace ? ` ${raw.trimStart()}` : raw;
    }

    previousEnd = item.x + item.width;
  }

  return text.replace(/\s+/g, " ").trim();
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

function cleanPageLine(y: number, value: string): PageLine | null {
  const collapsed = value.replace(/\s+/g, " ").trim();
  const joinNext = TRAILING_WRAP_GLYPH.test(collapsed);
  const withoutWrap = joinNext
    ? collapsed.replace(TRAILING_WRAP_GLYPH, "")
    : collapsed;
  const text = withoutWrap
    .replace(WRAP_GLYPHS, "")
    .replace(/\s+/g, " ")
    .trim();

  return text === "" ? null : { y, text, joinNext };
}

function toPageLines(lines: RawLine[]): PageLine[] {
  return lines
    .map((line) => cleanPageLine(line.y, buildLineText(line.items)))
    .filter((line): line is PageLine => line !== null);
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

  const starts = items.map((item) => item.x).sort((left, right) => left - right);

  for (const item of items) {
    const end = item.x + item.width;
    const nextStart = starts.find(
      (start) => start >= end + MIN_COLUMN_GUTTER,
    );

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
        rightEnds.push(
          Math.max(...right.map((item) => item.x + item.width)),
        );
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

/**
 * Turn a page's items into ordered line groups. A single-column page returns one
 * group. A two-column page returns the full-width banner first, then the left
 * column, then the right column, so a sidebar never interleaves with the main
 * body. Each group is a top-to-bottom sequence of lines.
 */
function layoutPageLines(items: PdfTextItem[]): PageLine[][] {
  const rawLines = groupRawLines(items);

  if (rawLines.length === 0) {
    return [];
  }

  const gutter = detectColumnGutter(rawLines);

  if (gutter === null) {
    return [toPageLines(rawLines)];
  }

  const banner: RawLine[] = [];
  const left: RawLine[] = [];
  const right: RawLine[] = [];

  for (const line of rawLines) {
    const { left: leftItems, right: rightItems, spans } = splitLine(
      line,
      gutter,
    );

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
    toPageLines(banner),
    toPageLines(left),
    toPageLines(right),
  ].filter((group) => group.length > 0);

  return groups.length > 1 ? groups : [toPageLines(rawLines)];
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

function paragraphGap(lines: PageLine[]): number {
  const gaps: number[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const gap = lines[index - 1].y - lines[index].y;

    if (gap > 0) {
      gaps.push(gap);
    }
  }

  const typical = median(gaps);

  return typical > 0
    ? typical * PARAGRAPH_GAP_FACTOR + PARAGRAPH_GAP_SLACK
    : Number.POSITIVE_INFINITY;
}

/** Rejoin words/URLs that a soft hyphen or broken glyph split across lines. */
function mergeWrappedLines(lines: PageLine[]): PageLine[] {
  const merged: PageLine[] = [];

  for (const line of lines) {
    const previous = merged[merged.length - 1];

    if (previous?.joinNext) {
      const text = `${previous.text}${line.text}`
        .replace(/\s+/g, " ")
        .trim();

      merged[merged.length - 1] = {
        y: previous.y,
        text,
        joinNext: line.joinNext,
      };
    } else {
      merged.push({ ...line });
    }
  }

  return merged;
}

function pushPageLines(lines: PageLine[], output: string[]): void {
  const merged = mergeWrappedLines(lines);
  const gapThreshold = paragraphGap(merged);

  merged.forEach((line, index) => {
    if (index > 0 && merged[index - 1].y - line.y > gapThreshold) {
      output.push("");
    }

    output.push(line.text);
  });
}

/**
 * Rebuild readable text from PDF.js `getTextContent()` items.
 *
 * Items are grouped into visual lines by their Y coordinate, ordered by X, and
 * separated by a blank line when the vertical gap is clearly larger than the
 * page's usual line spacing. Pages are separated by a blank line so entries do
 * not run together across a page break.
 *
 * Two-column pages are emitted as full-width banner, then left column, then
 * right column. Pages without a clean gutter keep the normal single-column
 * order.
 */
export function groupPdfTextItems(pages: PdfTextItem[][]): string {
  const output: string[] = [];

  pages.forEach((items, pageIndex) => {
    const groups = layoutPageLines(items);

    if (groups.length === 0) {
      return;
    }

    if (pageIndex > 0 && output.length > 0) {
      output.push("");
    }

    groups.forEach((group, groupIndex) => {
      if (groupIndex > 0 && output.length > 0) {
        output.push("");
      }

      pushPageLines(group, output);
    });
  });

  return output.join("\n").trim();
}

async function loadPdfjs() {
  // Importing the worker module registers `globalThis.pdfjsWorker`, which
  // makes PDF.js use its in-thread fake worker. No separate worker asset needs
  // to be served from the static export.
  await import("pdfjs-dist/build/pdf.worker.mjs");

  return import("pdfjs-dist");
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await loadPdfjs();
  const document = await pdfjs.getDocument({
    data: new Uint8Array(data),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  try {
    const pages: PdfTextItem[][] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];

      for (const item of content.items) {
        if ("str" in item) {
          items.push({
            str: item.str,
            transform: item.transform,
            width: item.width,
            hasEOL: item.hasEOL,
          });
        }
      }

      pages.push(items);
      page.cleanup();
    }

    return groupPdfTextItems(pages);
  } finally {
    await document.destroy();
  }
}

export async function parsePdfResume(
  data: ArrayBuffer,
): Promise<PdfResumeResult> {
  const text = await extractPdfText(data);

  return {
    text,
    doc: parsePastedResume(text),
  };
}
