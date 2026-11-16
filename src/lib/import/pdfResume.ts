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

type PageLine = {
  y: number;
  text: string;
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

function toPositionedItem(item: PdfTextItem): PositionedItem | null {
  if (typeof item.str !== "string" || item.str.trim() === "") {
    return null;
  }

  const transform = item.transform;
  const x = transform && transform.length >= 6 ? transform[4] : 0;
  const y = transform && transform.length >= 6 ? transform[5] : 0;
  const reportedWidth = item.width ?? 0;

  return {
    text: item.str,
    x,
    y,
    width:
      reportedWidth > 0
        ? reportedWidth
        : item.str.trim().length * FALLBACK_CHAR_WIDTH,
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

function groupPageLines(items: PdfTextItem[]): PageLine[] {
  const positioned = items
    .map(toPositionedItem)
    .filter((item): item is PositionedItem => item !== null)
    .sort((left, right) => right.y - left.y || left.x - right.x);

  const lines: Array<{ y: number; items: PositionedItem[] }> = [];

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

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) => ({ y: line.y, text: buildLineText(line.items) }))
    .filter((line) => line.text !== "");
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

/**
 * Rebuild readable text from PDF.js `getTextContent()` items.
 *
 * Items are grouped into visual lines by their Y coordinate, ordered by X, and
 * separated by a blank line when the vertical gap is clearly larger than the
 * page's usual line spacing. Pages are separated by a blank line so entries do
 * not run together across a page break.
 */
export function groupPdfTextItems(pages: PdfTextItem[][]): string {
  const output: string[] = [];

  pages.forEach((items, pageIndex) => {
    const lines = groupPageLines(items);

    if (lines.length === 0) {
      return;
    }

    if (pageIndex > 0 && output.length > 0) {
      output.push("");
    }

    const gapThreshold = paragraphGap(lines);

    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        const gap = lines[lineIndex - 1].y - line.y;

        if (gap > gapThreshold) {
          output.push("");
        }
      }

      output.push(line.text);
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
