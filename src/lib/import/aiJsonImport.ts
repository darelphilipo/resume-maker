/**
 * Rescue import for resumes that a normal PDF paste cannot read (scans, images,
 * Canva exports). The user copies the prompt below into a chat assistant they
 * trust and pastes the reply back here. Nothing is sent by this app: the reply
 * is cleaned locally and fed to the same `parseResumeJson` used by Backup &
 * Restore, so native backups and JSON Resume files both work.
 */

import type { ResumeDocument } from "@/lib/schema/resume.schema";
import { parseResumeJson, type ParseResult } from "@/lib/schema/serialize";

/** Copyable instructions for the assistant. Keep the output machine-readable. */
export const AI_IMPORT_PROMPT = [
  "Convert the resume I paste below into standard JSON Resume format (https://jsonresume.org/schema/).",
  "Keep every fact exactly as written: do not invent, rewrite, or omit details.",
  "Use the standard top-level keys where relevant: basics, work, education, projects, skills, certificates, awards, languages, interests, volunteer, publications, references.",
  "Use ISO dates such as 2024-01. Return only the JSON object, with no markdown fences, commentary, or trailing commas.",
  "Resume:",
  "",
].join("\n");

export const AI_IMPORT_EMPTY_MESSAGE =
  "Paste the assistant's reply first — the JSON resume it returned.";
export const AI_IMPORT_INCOMPLETE_MESSAGE =
  "That reply didn't contain a complete JSON resume. Copy the whole response, including the closing bracket, and try again.";
export const AI_IMPORT_INVALID_MESSAGE =
  "That JSON didn't look like a resume. Ask for the standard JSON Resume format and try again.";

/** Lines that are only an opening/closing markdown code fence. */
const CODE_FENCE_LINE = /^\s*```(?:json|js|javascript)?\s*$/gim;

/**
 * Drop markdown fences without touching braces in the JSON itself. Prose before
 * or after the fence stays, because `extractJsonBlock` ignores everything
 * outside the first balanced object/array.
 */
export function stripCodeFences(input: string): string {
  return input.replace(CODE_FENCE_LINE, "");
}

/**
 * Return the first balanced `{...}` or `[...]` block, ignoring braces inside
 * quoted strings. `null` means the paste is truncated or has no JSON at all.
 */
export function extractJsonBlock(input: string): string | null {
  let start = -1;

  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "{" || input[index] === "[") {
      start = index;
      break;
    }
  }

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;

      if (depth === 0) {
        return input.slice(start, index + 1);
      }

      if (depth < 0) {
        return null;
      }
    }
  }

  return null;
}

/** Remove commas directly before a closing brace/bracket, outside strings. */
export function stripTrailingCommas(input: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      continue;
    }

    if (char === ",") {
      let next = index + 1;

      while (next < input.length && /\s/.test(input[next])) {
        next += 1;
      }

      if (input[next] === "}" || input[next] === "]") {
        // Drop the whitespace around the comma too, so the cleaned paste is
        // not just parseable but tidy (and stable across repeated pastes).
        output = output.replace(/\s+$/, "");
        index = next - 1;
        continue;
      }
    }

    output += char;
  }

  return output;
}

/** An assistant reply with no name, headline, prose, or entries is not a resume. */
function hasResumeContent(doc: ResumeDocument): boolean {
  if (doc.basics.name.trim() !== "" || doc.basics.headline.trim() !== "") {
    return true;
  }

  if (doc.summary.content.replace(/<[^>]*>/g, "").trim() !== "") {
    return true;
  }

  return Object.values(doc.sections).some(
    (section) => "items" in section && section.items.length > 0,
  );
}

/**
 * Clean a pasted assistant reply into a ResumeDocument. Each failure mode gets
 * a short, actionable message instead of a raw JSON.parse stack.
 */
export function parseAiJsonResume(input: string): ParseResult {
  const cleaned = stripCodeFences(input).trim();

  if (cleaned === "") {
    return { ok: false, error: AI_IMPORT_EMPTY_MESSAGE };
  }

  const block = extractJsonBlock(cleaned);

  if (block === null) {
    return { ok: false, error: AI_IMPORT_INCOMPLETE_MESSAGE };
  }

  let raw: unknown;

  try {
    raw = JSON.parse(stripTrailingCommas(block));
  } catch {
    return { ok: false, error: AI_IMPORT_INCOMPLETE_MESSAGE };
  }

  const result = parseResumeJson(raw);

  if (!result.ok || !hasResumeContent(result.doc)) {
    return { ok: false, error: AI_IMPORT_INVALID_MESSAGE };
  }

  return result;
}
