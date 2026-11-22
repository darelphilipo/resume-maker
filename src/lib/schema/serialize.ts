import { z } from "zod";

import {
  isJsonResumeDocument,
  resumeFromJsonResume,
} from "./jsonResume";
import { ResumeDocumentSchema, type ResumeDocument } from "./resume.schema";

export type ParseResult =
  | { ok: true; doc: ResumeDocument }
  | { ok: false; error: string };

export function parseResumeJson(input: unknown): ParseResult {
  let raw: unknown = input;

  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Invalid JSON: ${message}` };
    }
  }

  if (isJsonResumeDocument(raw)) {
    try {
      const result = ResumeDocumentSchema.safeParse(resumeFromJsonResume(raw));

      if (!result.success) {
        return { ok: false, error: z.prettifyError(result.error) };
      }

      return { ok: true, doc: result.data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Invalid JSON Resume file: ${message}` };
    }
  }

  const result = ResumeDocumentSchema.safeParse(raw);

  if (!result.success) {
    return { ok: false, error: z.prettifyError(result.error) };
  }

  return { ok: true, doc: result.data };
}

export function serializeResume(doc: ResumeDocument): string {
  return JSON.stringify(doc, null, 2) ?? "";
}
