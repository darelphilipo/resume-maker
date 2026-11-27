/**
 * Zero-AI resume lint.
 *
 * These checks are deliberately deterministic and run over the document model,
 * not the rendered DOM: the Content panel can show the report even while the
 * Preview tab is hidden. They only look at bullets inside visible sections, so
 * a hidden entry cannot make the badge red, and they never rewrite prose —
 * `standardizeBulletPeriods` is a separate, explicit one-click edit.
 *
 * Everything here is client-side: no network calls, no AI, no persistence.
 */

import { richTextToPlainText } from "@/lib/ats/atsText";
import { bulletSnippet } from "@/lib/lint/bulletMetrics";
import {
  DEFAULT_SECTION_ORDER,
  type ResumeDocument,
} from "@/lib/schema/resume.schema";
import {
  itemId,
  resolveSection,
  text,
  type ItemRecord,
  type ListKind,
} from "@/templates/shared/sectionData";

/**
 * Nouns that turn a following `I` into a Roman numeral (`Phase I`, `Part I`)
 * rather than the first-person pronoun.
 */
const ROMAN_NUMERAL_CONTEXT =
  "(?:phase|part|section|level|tier|class|grade|category|appendix|volume|book|chapter|type|stage|step|unit|module|group|series|world\\s+war)";

/**
 * First-person pronouns, excluding `i.e.` and `I/O` (the trailing lookahead)
 * and Roman numerals such as `Phase I` (the context lookbehind).
 */
export const FIRST_PERSON_PATTERN = new RegExp(
  `\\b(?:(?<!\\b${ROMAN_NUMERAL_CONTEXT}\\s+)I(?![./])|me|my|we|our)\\b`,
  "i",
);
export const FILLER_WORDS = [
  "meticulously",
  "diligently",
  "synergistic",
  "successfully",
  "expertly",
] as const;
export const MAX_LINT_SNIPPETS = 3;

const FILLER_PATTERN = new RegExp(
  `\\b(?:${FILLER_WORDS.join("|")})\\b`,
  "i",
);

export type ResumeLintCheckId =
  | "mixed-periods"
  | "first-person"
  | "filler"
  | "repeated-verbs";

export type ResumeLintFinding = {
  id: ResumeLintCheckId;
  title: string;
  /** Plain-language explanation with counts. */
  detail: string;
  /** Affected bullets (or repeated openings) for this finding. */
  count: number;
  /** Up to `MAX_LINT_SNIPPETS` opening words, never the full bullet. */
  snippets: string[];
};

export type BulletPeriodCounts = {
  /** Bullets ending with a full stop. */
  withPeriod: number;
  /** Bullets with no terminal punctuation at all. */
  withoutPeriod: number;
  /** Bullets ending with `?`, `!`, `;`, or `:` (intentionally left alone). */
  otherTerminal: number;
  /** Some bullets use a period and others use none. */
  mixed: boolean;
};

export type ResumeLintReport = {
  findings: ResumeLintFinding[];
  issueCount: number;
  bulletCount: number;
  periods: BulletPeriodCounts;
  pronounCount: number;
  fillerCount: number;
  repeatedVerbCount: number;
};

export type BulletPeriodStyle = "add" | "remove";

export type CollectedBullet = {
  /** Inner HTML of the `<li>` (formatting preserved). */
  html: string;
  text: string;
  entryKey: string;
  entryLabel: string;
};

type ListItemSpan = {
  innerStart: number;
  innerEnd: number;
};

/**
 * Rich-text field that holds bullets for each section kind. Everything else
 * (skills, languages, interests, profiles) has no bullet list to lint.
 */
const RICH_TEXT_FIELDS: Partial<Record<ListKind | "summary", string>> = {
  summary: "content",
  experience: "summary",
  education: "summary",
  projects: "description",
  awards: "summary",
  volunteer: "summary",
  publications: "summary",
  references: "summary",
  custom: "description",
};

const LI_TAG_PATTERN = /<\/?li\b[^>]*>/gi;
const NESTED_LIST_PATTERN = /<li\b/i;

/**
 * Openers that are not verbs. Without this, two bullets starting with "The" or
 * "I" would be reported as a repeated verb, which is not actionable advice.
 */
const NON_VERB_OPENERS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "i",
  "in",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "over",
  "that",
  "the",
  "these",
  "this",
  "those",
  "to",
  "under",
  "we",
  "with",
]);

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

/**
 * The section order used by the resume, de-duplicated across every layout page
 * so a section that spilled onto page 2 is still linted. Custom sections are
 * appended defensively in case an older row lost its layout entry.
 */
function orderedSectionIds(doc: ResumeDocument): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  const add = (id: string): void => {
    if (id !== "" && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  };

  for (const page of doc.metadata.layout.pages) {
    page.main.forEach(add);
    page.sidebar.forEach(add);
  }

  if (ids.length === 0) {
    DEFAULT_SECTION_ORDER.forEach(add);
  }

  for (const section of doc.customSections) {
    add(section.id);
  }

  return ids;
}

/**
 * Finds top-level `<li>` spans with a depth counter, so a nested list cannot
 * make a non-greedy regex stop at the wrong closing tag.
 */
function findListItemSpans(html: string): ListItemSpan[] {
  const spans: ListItemSpan[] = [];
  const pattern = new RegExp(LI_TAG_PATTERN.source, LI_TAG_PATTERN.flags);
  let depth = 0;
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
        spans.push({ innerStart, innerEnd: match.index });
      }

      continue;
    }

    if (depth === 0) {
      innerStart = match.index + tag.length;
    }

    depth += 1;
  }

  return spans;
}

function bulletPlainText(innerHtml: string): string {
  return richTextToPlainText(innerHtml).replace(/\s+/g, " ").trim();
}

function extractBulletHtml(html: string): string[] {
  const bullets: string[] = [];

  for (const span of findListItemSpans(html)) {
    const inner = html.slice(span.innerStart, span.innerEnd);

    if (NESTED_LIST_PATTERN.test(inner)) {
      bullets.push(...extractBulletHtml(inner));
      continue;
    }

    if (bulletPlainText(inner) !== "") {
      bullets.push(inner);
    }
  }

  return bullets;
}

function entryLabel(kind: ListKind, item: ItemRecord): string {
  const candidates =
    kind === "experience"
      ? ["position", "company"]
      : kind === "education"
        ? ["degree", "school"]
        : ["name", "title", "organization", "network", "position", "company"];

  for (const field of candidates) {
    const value = text(item, field).trim();

    if (value !== "") {
      return value;
    }
  }

  return "Untitled role";
}

/**
 * Every visible bullet in the resume, paired with the role it belongs to.
 * Exported for tests and for future checks that need the same collection.
 */
export function collectResumeBullets(doc: ResumeDocument): CollectedBullet[] {
  const bullets: CollectedBullet[] = [];

  const append = (html: string, entryKey: string, label: string): void => {
    for (const inner of extractBulletHtml(html)) {
      bullets.push({
        html: inner,
        text: bulletPlainText(inner),
        entryKey,
        entryLabel: label,
      });
    }
  };

  for (const sectionId of orderedSectionIds(doc)) {
    const resolved = resolveSection(doc, sectionId);

    if (!resolved) {
      continue;
    }

    if (resolved.kind === "summary") {
      append(doc.summary.content, "summary", "Summary");
      continue;
    }

    const field = RICH_TEXT_FIELDS[resolved.kind];

    if (!field) {
      continue;
    }

    resolved.items.forEach((item, index) => {
      const key = `${resolved.kind}:${itemId(item, index)}`;
      const html = text(item, field);

      if (html.trim() !== "") {
        append(html, key, entryLabel(resolved.kind, item));
      }
    });
  }

  return bullets;
}

function periodEnding(text: string): "period" | "other" | "none" {
  if (/\.$/.test(text)) {
    return "period";
  }

  if (/[!?;:]$/.test(text)) {
    return "other";
  }

  return "none";
}

function firstWord(text: string): string {
  const match = /[A-Za-z][A-Za-z'’-]*/.exec(text);

  return match ? match[0] : "";
}

function snippetsFrom(bullets: readonly CollectedBullet[]): string[] {
  return bullets
    .slice(0, MAX_LINT_SNIPPETS)
    .map((bullet) => bulletSnippet(bullet.text));
}

/**
 * Classifies every visible bullet and returns the findings plus the raw counts
 * the popover needs to enable the right period action.
 */
export function analyzeResumeLint(doc: ResumeDocument): ResumeLintReport {
  const bullets = collectResumeBullets(doc);
  const findings: ResumeLintFinding[] = [];

  let withPeriod = 0;
  let withoutPeriod = 0;
  let otherTerminal = 0;

  for (const bullet of bullets) {
    const ending = periodEnding(bullet.text);

    if (ending === "period") {
      withPeriod += 1;
    } else if (ending === "other") {
      otherTerminal += 1;
    } else {
      withoutPeriod += 1;
    }
  }

  const mixed = withPeriod > 0 && withoutPeriod > 0;

  if (mixed) {
    const withCopy = `${withPeriod} ${plural(
      withPeriod,
      "bullet",
    )} ${withPeriod === 1 ? "ends" : "end"} with a period`;
    const withoutCopy = `${withoutPeriod} ${plural(
      withoutPeriod,
      "bullet",
    )} ${withoutPeriod === 1 ? "does" : "do"} not`;

    findings.push({
      id: "mixed-periods",
      title: "Mixed bullet periods",
      detail: `${withCopy} and ${withoutCopy}.`,
      count: withPeriod + withoutPeriod,
      snippets: snippetsFrom(
        bullets.filter((bullet) => periodEnding(bullet.text) !== "other"),
      ),
    });
  }

  const pronounBullets = bullets.filter((bullet) =>
    FIRST_PERSON_PATTERN.test(bullet.text),
  );

  if (pronounBullets.length > 0) {
    findings.push({
      id: "first-person",
      title: "First-person pronouns",
      detail: `${pronounBullets.length} ${plural(
        pronounBullets.length,
        "bullet",
      )} use${pronounBullets.length === 1 ? "s" : ""} I, me, my, we, or our.`,
      count: pronounBullets.length,
      snippets: snippetsFrom(pronounBullets),
    });
  }

  const fillerBullets = bullets.filter((bullet) =>
    FILLER_PATTERN.test(bullet.text),
  );

  if (fillerBullets.length > 0) {
    findings.push({
      id: "filler",
      title: "Filler adverbs",
      detail: `${fillerBullets.length} ${plural(
        fillerBullets.length,
        "bullet",
      )} use${fillerBullets.length === 1 ? "s" : ""} filler such as ${FILLER_WORDS.slice(
        0,
        3,
      ).join(", ")}.`,
      count: fillerBullets.length,
      snippets: snippetsFrom(fillerBullets),
    });
  }

  const byEntry = new Map<string, CollectedBullet[]>();

  for (const bullet of bullets) {
    const group = byEntry.get(bullet.entryKey);

    if (group) {
      group.push(bullet);
    } else {
      byEntry.set(bullet.entryKey, [bullet]);
    }
  }

  let repeatedVerbCount = 0;

  for (const group of byEntry.values()) {
    if (group.length < 2) {
      continue;
    }

    const byVerb = new Map<
      string,
      { display: string; bullets: CollectedBullet[] }
    >();

    for (const bullet of group) {
      const word = firstWord(bullet.text);

      if (word === "") {
        continue;
      }

      const key = word.toLowerCase();

      if (NON_VERB_OPENERS.has(key)) {
        continue;
      }
      const existing = byVerb.get(key);

      if (existing) {
        existing.bullets.push(bullet);
      } else {
        byVerb.set(key, { display: word, bullets: [bullet] });
      }
    }

    for (const { display, bullets: matches } of byVerb.values()) {
      if (matches.length < 2) {
        continue;
      }

      repeatedVerbCount += matches.length;
      findings.push({
        id: "repeated-verbs",
        title: `Repeated opening verb “${display}”`,
        detail: `${matches.length} bullets in ${group[0].entryLabel} start with “${display}”.`,
        count: matches.length,
        snippets: snippetsFrom(matches),
      });
    }
  }

  return {
    findings,
    issueCount: findings.length,
    bulletCount: bullets.length,
    periods: {
      withPeriod,
      withoutPeriod,
      otherTerminal,
      mixed,
    },
    pronounCount: pronounBullets.length,
    fillerCount: fillerBullets.length,
    repeatedVerbCount,
  };
}

function addTrailingPeriod(innerHtml: string): string {
  const plain = bulletPlainText(innerHtml);

  if (plain === "" || /[.!?;:]$/.test(plain)) {
    return innerHtml;
  }

  const trimmed = innerHtml.replace(/\s+$/, "");
  const trailingBreak = /<\s*br\s*\/?>\s*$/i.exec(trimmed);
  const finalBlockClose = /<\/(?:p|div)>\s*$/i.exec(trimmed);
  const insertAt =
    trailingBreak?.index !== undefined
      ? trailingBreak.index
      : finalBlockClose?.index;

  if (insertAt !== undefined) {
    return `${trimmed.slice(0, insertAt)}.${trimmed.slice(insertAt)}`;
  }

  return `${trimmed}.`;
}

function removeTrailingPeriod(innerHtml: string): string {
  // Only a single final period is removed (`...` stays an ellipsis), and every
  // closing tag or hard break after it is captured as one group so nested
  // inline formatting such as `<strong>text.</strong></p>` survives the edit.
  return innerHtml.replace(
    /(?<!\.)\.((?:\s*(?:<\s*br\s*\/?>|<\/[^>]+>)\s*)*)$/i,
    "$1",
  );
}

function transformListItems(
  html: string,
  transform: (innerHtml: string) => string,
): string {
  const spans = findListItemSpans(html);

  if (spans.length === 0) {
    return html;
  }

  let result = "";
  let cursor = 0;

  for (const span of spans) {
    const inner = html.slice(span.innerStart, span.innerEnd);

    result += html.slice(cursor, span.innerStart);
    // A parent bullet that wraps a nested list is not itself a bullet; recurse
    // so the child bullets can still be standardized without adding a period to
    // the parent line.
    result += NESTED_LIST_PATTERN.test(inner)
      ? transformListItems(inner, transform)
      : transform(inner);
    cursor = span.innerEnd;
  }

  result += html.slice(cursor);

  return result;
}

function cloneDocument(doc: ResumeDocument): ResumeDocument {
  return JSON.parse(JSON.stringify(doc)) as ResumeDocument;
}

/**
 * Returns a new document with every visible bullet's trailing period removed
 * (`remove`) or added (`add`). Bullets ending in `?`, `!`, `;`, or `:` are left
 * untouched. The input document is never mutated, and the caller commits the
 * result through the store so one undo restores the original prose.
 */
export function standardizeBulletPeriods(
  doc: ResumeDocument,
  style: BulletPeriodStyle,
): ResumeDocument {
  const transform = style === "add" ? addTrailingPeriod : removeTrailingPeriod;
  const next = cloneDocument(doc);

  for (const sectionId of orderedSectionIds(next)) {
    if (sectionId === "summary") {
      if (!next.summary.hidden) {
        next.summary.content = transformListItems(
          next.summary.content,
          transform,
        );
      }

      continue;
    }

    const resolved = resolveSection(next, sectionId);

    if (!resolved || resolved.kind === "summary") {
      continue;
    }

    const field = RICH_TEXT_FIELDS[resolved.kind];

    if (!field) {
      continue;
    }

    for (const item of resolved.items) {
      const html = text(item, field);

      if (html.trim() === "") {
        continue;
      }

      const updated = transformListItems(html, transform);

      if (updated !== html) {
        item[field] = updated;
      }
    }
  }

  return next;
}
