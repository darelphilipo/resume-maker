/**
 * Zero-AI bullet trimming hints.
 *
 * The preview already renders the real resume DOM, so the cheapest way to spot
 * a bullet that wastes a line is to measure its rendered line boxes: a last
 * line holding only a word or two means trimming a few words can pull the whole
 * bullet up by one line. Long bullets are flagged separately because they are
 * hard to scan even when they do not end in an orphan.
 *
 * Everything here is client-side and deterministic: no network calls, no AI,
 * and no document mutation.
 */

export const ORPHAN_MAX_WORDS = 3;
export const LONG_BULLET_CHARS = 240;
export const LONG_BULLET_LINES = 3;
export const MAX_LISTED_ISSUES = 5;

const LINE_TOP_TOLERANCE_PX = 2;
const WORD_PATTERN = /\S+/g;

export type BulletIssueKind = "orphan" | "long";

export type BulletIssue = {
  kind: BulletIssueKind;
  /** Collapsed full bullet text. */
  text: string;
  /** Short, display-safe preview of the bullet. */
  snippet: string;
  charCount: number;
  lineCount: number;
  /** Words on the final rendered line (orphan detection). */
  lastLineWords: number;
  /** Lines a trim would plausibly reclaim. */
  reclaimableLines: number;
  /**
   * Rendered section/entry ids, read from the preview DOM. They let the trim
   * dialog jump straight to the editor form that owns the bullet. Optional
   * because the pure line analyser never sees layout.
   */
  sectionId?: string;
  entryId?: string;
};

export type BulletLintReport = {
  issues: BulletIssue[];
  orphanCount: number;
  longCount: number;
  reclaimableLines: number;
  /** One-line summary for the overflow banner, or `null` when clean. */
  summary: string | null;
};

export function normalizeBulletText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function wordCount(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

/**
 * Formats the orphan line range. A single-word overflow is not a range, so it
 * reads "1 word" instead of the confusing "1–1 word".
 */
function wordRangeLabel(maxWords: number): string {
  if (maxWords <= 1) {
    return `1 ${plural(1, "word")}`;
  }

  return `1–${maxWords} ${plural(maxWords, "word")}`;
}

export function bulletSnippet(text: string, maxLength = 92): string {
  const normalized = normalizeBulletText(text);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const cut = normalized.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;

  return `${trimmed.trimEnd()}…`;
}

/**
 * Classifies one bullet from its rendered lines.
 *
 * A bullet is an **orphan** when it wraps and its final line has 1–3 words.
 * It is **long** when it is 240+ characters or runs past three rendered lines.
 * Long wins when both apply, because the actionable advice is to cut it down.
 */
export function analyzeBulletLines(
  lines: readonly string[],
): BulletIssue | null {
  const cleaned = lines
    .map(normalizeBulletText)
    .filter((line) => line.length > 0);

  if (cleaned.length === 0) {
    return null;
  }

  const text = cleaned.join(" ");
  const charCount = text.length;
  const lastLineWords = wordCount(cleaned[cleaned.length - 1]);
  const isOrphan =
    cleaned.length > 1 &&
    lastLineWords > 0 &&
    lastLineWords <= ORPHAN_MAX_WORDS;
  const isLong =
    charCount >= LONG_BULLET_CHARS || cleaned.length > LONG_BULLET_LINES;

  if (!isOrphan && !isLong) {
    return null;
  }

  const kind: BulletIssueKind = isLong ? "long" : "orphan";

  return {
    kind,
    text,
    snippet: bulletSnippet(text),
    charCount,
    lineCount: cleaned.length,
    lastLineWords,
    reclaimableLines:
      kind === "long" ? Math.max(1, cleaned.length - LONG_BULLET_LINES) : 1,
  };
}

export function summarizeBulletIssues(
  issues: readonly BulletIssue[],
): BulletLintReport {
  const orphanIssues = issues.filter((issue) => issue.kind === "orphan");
  const longIssues = issues.filter((issue) => issue.kind === "long");
  const reclaimableLines = issues.reduce(
    (total, issue) => total + issue.reclaimableLines,
    0,
  );

  const parts: string[] = [];

  if (orphanIssues.length > 0) {
    const maxWords = Math.max(
      ...orphanIssues.map((issue) => issue.lastLineWords),
    );

    parts.push(
      `${orphanIssues.length} ${plural(
        orphanIssues.length,
        "bullet",
      )} spill${orphanIssues.length === 1 ? "s" : ""} by ${wordRangeLabel(
        maxWords,
      )}`,
    );
  }

  if (longIssues.length > 0) {
    parts.push(
      `${longIssues.length} long ${plural(
        longIssues.length,
        "bullet",
      )} (${LONG_BULLET_CHARS}+ characters)`,
    );
  }

  const summary =
    issues.length === 0
      ? null
      : `${parts.join(" and ")} — trimming ${
          issues.length === 1 ? "it" : "them"
        } can reclaim ${reclaimableLines} ${plural(
          reclaimableLines,
          "line",
        )}.`;

  return {
    issues: [...issues],
    orphanCount: orphanIssues.length,
    longCount: longIssues.length,
    reclaimableLines,
    summary,
  };
}

type TextSegment = {
  node: Text;
  start: number;
  end: number;
};

type LineBox = {
  top: number;
  bottom: number;
  words: string[];
};

function collectTextSegments(element: Element): {
  text: string;
  segments: TextSegment[];
} {
  const doc = element.ownerDocument;
  const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const segments: TextSegment[] = [];
  let text = "";
  let node = walker.nextNode();

  while (node) {
    const value = node.nodeValue ?? "";

    if (value.length > 0) {
      segments.push({
        node: node as Text,
        start: text.length,
        end: text.length + value.length,
      });
      text += value;
    }

    node = walker.nextNode();
  }

  return { text, segments };
}

function segmentAtOffset(
  segments: readonly TextSegment[],
  offset: number,
): TextSegment | null {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    if (offset >= segments[index].start) {
      return segments[index];
    }
  }

  return segments[0] ?? null;
}

function addWordToLine(lines: LineBox[], rect: DOMRect, word: string): void {
  const line = lines.find(
    (candidate) =>
      rect.top < candidate.bottom - LINE_TOP_TOLERANCE_PX &&
      rect.bottom > candidate.top + LINE_TOP_TOLERANCE_PX,
  );

  if (line) {
    line.top = Math.min(line.top, rect.top);
    line.bottom = Math.max(line.bottom, rect.bottom);

    if (!line.words.includes(word)) {
      line.words.push(word);
    }

    return;
  }

  lines.push({ top: rect.top, bottom: rect.bottom, words: [word] });
}

/**
 * Measures the rendered line boxes of one bullet.
 *
 * Each whitespace-delimited word gets its own `Range`, so inline formatting
 * (`<strong>`, links, …) does not hide a word from the line count. Rects are
 * grouped by vertical position because that is what the browser actually
 * painted. When layout is unavailable (jsdom, SSR), the bullet falls back to a
 * single line so character-based checks still work.
 */
export function measureBulletLines(element: Element): string[] {
  const { text, segments } = collectTextSegments(element);
  const normalized = normalizeBulletText(text);

  if (normalized.length === 0) {
    return [];
  }

  if (segments.length === 0) {
    return [normalized];
  }

  const doc = element.ownerDocument;
  const lines: LineBox[] = [];
  const matches = text.matchAll(WORD_PATTERN);

  for (const match of matches) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const startSegment = segmentAtOffset(segments, start);
    const endSegment = segmentAtOffset(segments, Math.max(start, end - 1));

    if (!startSegment || !endSegment) {
      continue;
    }

    const range = doc.createRange();

    range.setStart(startSegment.node, start - startSegment.start);
    range.setEnd(endSegment.node, end - endSegment.start);

    // jsdom (and a few non-browser DOM shims) expose Range without layout.
    // Fall back to the text-only path so character checks still work there.
    const rects =
      typeof range.getClientRects === "function" ? range.getClientRects() : [];

    for (const rect of Array.from(rects)) {
      if (rect.width <= 0 || rect.height <= 0) {
        continue;
      }

      addWordToLine(lines, rect, match[0]);
    }
  }

  if (lines.length === 0) {
    return [normalized];
  }

  return lines
    .sort((left, right) => left.top - right.top)
    .map((line) => line.words.join(" "));
}

/**
 * Scans every rendered resume bullet in `root` and returns a trim report.
 *
 * Parent `<li>`s of nested lists are skipped so one bullet is never counted
 * twice, and the trim-tips panel itself is ignored if it ever lives inside the
 * scanned subtree.
 */
export function scanBulletLint(root: ParentNode): BulletLintReport {
  const issues: BulletIssue[] = [];

  for (const item of Array.from(root.querySelectorAll("li"))) {
    if (item.querySelector("li") || item.closest("[data-bullet-trim-tips]")) {
      continue;
    }

    const issue = analyzeBulletLines(measureBulletLines(item));

    if (issue) {
      const section = item.closest<HTMLElement>("[data-section-id]");
      const entry = item.closest<HTMLElement>("[data-entry-id]");

      issues.push({
        ...issue,
        sectionId: section?.dataset.sectionId,
        entryId: entry?.dataset.entryId,
      });
    }
  }

  return summarizeBulletIssues(issues);
}
