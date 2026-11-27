/**
 * Client-side PDF import. PDF.js extracts the text items, `pdfLayout` rebuilds
 * readable lines with their visual metadata, and `parsePastedResume` turns those
 * lines into the same `ResumeDocument` shape as the paste importer.
 *
 * PDF.js is loaded lazily so the launcher and editor bundles stay small, and
 * its worker module is imported on the main thread instead of being served as a
 * separate asset. That keeps the static export self-contained and offline-safe:
 * no CDN, no server route, and no `basePath`-sensitive worker URL.
 */

import {
  flattenPdfLines,
  layoutPdfPage,
  layoutPdfPages,
  mergeWrappedPdfLines,
  type PdfLine,
  type PdfTextItem,
} from "@/lib/import/pdfLayout";
import { parsePastedResume } from "@/lib/import/pasteResume";
import { detectProfileLink } from "@/lib/links/contactLinks";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

export type { PdfLine, PdfPhrase, PdfTextItem } from "@/lib/import/pdfLayout";

export type PdfResumeResult = {
  /** Reconstructed plain text, useful for distinguishing empty/scanned PDFs. */
  text: string;
  /** Structured lines for the richer paste parser path. */
  lines: PdfLine[];
  /** Parsed resume, or null when the text did not look like a resume. */
  doc: ResumeDocument | null;
};

/** A PDF link annotation as exposed by PDF.js `page.getAnnotations()`. */
export type PdfLinkAnnotation = {
  subtype?: string;
  url?: string;
  unsafeUrl?: string;
};

/**
 * Profile URLs that exist only as hyperlinks in the PDF. Design tools often
 * print `LinkedIn` or a GitHub icon while the destination lives in the link
 * annotation, so the visible text alone loses the contact. Only known profile
 * hosts are returned; a personal site stays a website and is never invented.
 */
export function profileUrlsFromAnnotations(
  annotations: readonly PdfLinkAnnotation[],
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const annotation of annotations) {
    if (annotation.subtype && annotation.subtype !== "Link") {
      continue;
    }

    const raw = (annotation.url ?? annotation.unsafeUrl ?? "").trim();

    if (raw === "" || !detectProfileLink(raw)) {
      continue;
    }

    if (seen.has(raw)) {
      continue;
    }

    seen.add(raw);
    urls.push(raw);
  }

  return urls;
}

/** A gap this much larger than the usual line spacing starts a new paragraph. */
const PARAGRAPH_GAP_FACTOR = 1.6;
const PARAGRAPH_GAP_SLACK = 2;

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

function paragraphGap(lines: PdfLine[]): number {
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

function pushPageLines(lines: PdfLine[], output: string[]): void {
  const merged = mergeWrappedPdfLines(lines);
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
    const groups = layoutPdfPage(items);

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

type FontObjectSource = {
  commonObjs: { get: (objId: string) => unknown };
};

/**
 * Prefer the real font name (e.g. `ABCDEF+Arial-BoldMT`) so weight can be read
 * from it. Font objects only resolve after the page's operator list is built,
 * and `commonObjs.get` throws for an unresolved id, so fall back to the id.
 */
function resolveFontName(
  page: FontObjectSource,
  fontName: string | undefined,
): string {
  if (!fontName) {
    return "";
  }

  try {
    const font = page.commonObjs.get(fontName) as { name?: unknown } | null;

    if (font && typeof font.name === "string" && font.name.trim() !== "") {
      return font.name;
    }
  } catch {
    // Unresolved font id: the raw id is still usable for layout.
  }

  return fontName;
}

async function readPdfPages(data: ArrayBuffer): Promise<PdfTextItem[][]> {
  const pdfjs = await loadPdfjs();
  const document = await pdfjs.getDocument({
    data: new Uint8Array(data),
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  try {
    const pages: PdfTextItem[][] = [];
    const annotationUrls: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);

      // Build the operator list first so `page.commonObjs` holds the actual
      // font objects (with their descriptive names) instead of unresolved ids.
      // A malformed embedded font must not fail the whole import: fall back to
      // PDF.js ids and let layout continue without weight metadata.
      try {
        await page.getOperatorList();
      } catch {
        // Font metadata is optional.
      }

      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];

      for (const item of content.items) {
        if ("str" in item) {
          items.push({
            str: item.str,
            transform: item.transform,
            width: item.width,
            height: item.height,
            fontName: resolveFontName(page, item.fontName),
            hasEOL: item.hasEOL,
          });
        }
      }

      // Hyperlinks are not part of the text layer. Collect recognised profile
      // destinations so a "LinkedIn" label still imports as a real profile.
      try {
        for (const url of profileUrlsFromAnnotations(
          await page.getAnnotations(),
        )) {
          if (!annotationUrls.includes(url)) {
            annotationUrls.push(url);
          }
        }
      } catch {
        // Annotations are optional.
      }

      pages.push(items);
      page.cleanup();
    }

    if (annotationUrls.length > 0 && pages.length > 0) {
      const firstPage = pages[0];
      const topY = firstPage.reduce((highest, item) => {
        const y =
          item.transform && item.transform.length >= 6
            ? item.transform[5]
            : 0;

        return Math.max(highest, y);
      }, 0);

      firstPage.unshift({
        str: annotationUrls.join(" | "),
        transform: [1, 0, 0, 1, 0, topY + 12],
        width: 0,
        fontName: "",
      });
    }

    return pages;
  } finally {
    await document.destroy();
  }
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  return groupPdfTextItems(await readPdfPages(data));
}

/** Structured lines, in reading order, for the richer paste parser path. */
export async function extractPdfLines(data: ArrayBuffer): Promise<PdfLine[]> {
  return flattenPdfLines(layoutPdfPages(await readPdfPages(data)));
}

export async function parsePdfResume(
  data: ArrayBuffer,
): Promise<PdfResumeResult> {
  const pages = await readPdfPages(data);
  const text = groupPdfTextItems(pages);
  const lines = flattenPdfLines(layoutPdfPages(pages));

  return {
    text,
    lines,
    // Prefer the structured lines: they carry bold/size/gap metadata that the
    // paste parser uses for headings and entry boundaries. Plain text is the
    // fallback for PDFs whose text layer produced no lines.
    doc: parsePastedResume(lines.length > 0 ? lines : text),
  };
}
