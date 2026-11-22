import Dexie, { type EntityTable } from "dexie";

import { newId } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";

import { UNTITLED_RESUME } from "./recentResumes";
import {
  normalizeTargetCompany,
  resumeStatusOf,
  resumeTargetCompany,
  type ResumeStatus,
} from "./resumeTracking";

export type ResumeRow = {
  id: string;
  updatedAt: number;
  doc: ResumeDocument;
  /**
   * Application tracking lives on the row so JSON backups stay pure resume
   * data. Both fields are optional: rows written before tracking existed load
   * as a master resume with no target company.
   */
  status?: ResumeStatus;
  targetCompany?: string;
};

export const RESUME_DB_NAME = "resume-maker";

export class ResumeDatabase extends Dexie {
  resumes!: EntityTable<ResumeRow, "id">;

  constructor(name: string = RESUME_DB_NAME) {
    super(name);
    this.version(1).stores({
      resumes: "id, updatedAt",
    });
  }
}

export const resumeDb = new ResumeDatabase();

export async function putResume(row: ResumeRow): Promise<void> {
  await resumeDb.resumes.put(row);
}

/**
 * Saves only the document. The launcher's status/target-company tags live on
 * the same row, so a plain `putResume({ id, updatedAt, doc })` would erase
 * them. Read-merge-write keeps tracking metadata intact through every autosave.
 */
export async function saveResumeDoc(
  id: string,
  doc: ResumeDocument,
): Promise<ResumeRow> {
  const existing = await getResume(id);
  const row: ResumeRow = {
    ...existing,
    id,
    updatedAt: Date.now(),
    doc,
  };

  await putResume(row);

  return row;
}

export type ResumeMetaPatch = {
  status?: ResumeStatus;
  targetCompany?: string;
};

/**
 * Updates only the launcher's tracking tags. `updatedAt` is deliberately left
 * alone: changing a status is not a resume edit, and it must not reorder the
 * "Recent resumes" list under the user's finger. A blank company tag removes
 * the field instead of storing an empty string.
 */
export async function updateResumeMeta(
  id: string,
  patch: ResumeMetaPatch,
): Promise<ResumeRow | null> {
  const row = await getResume(id);

  if (!row) {
    return null;
  }

  const next: ResumeRow = {
    ...row,
    status: patch.status ?? resumeStatusOf(row),
    targetCompany:
      patch.targetCompany === undefined
        ? resumeTargetCompany(row)
        : normalizeTargetCompany(patch.targetCompany),
  };

  if (next.targetCompany === "") {
    delete next.targetCompany;
  }

  await putResume(next);

  return next;
}

export async function getResume(id: string): Promise<ResumeRow | undefined> {
  return resumeDb.resumes.get(id);
}

export async function listResumes(): Promise<ResumeRow[]> {
  return resumeDb.resumes.toArray();
}

export async function listRecentResumes(limit = 10): Promise<ResumeRow[]> {
  return resumeDb.resumes.orderBy("updatedAt").reverse().limit(limit).toArray();
}

export async function deleteResume(id: string): Promise<void> {
  await resumeDb.resumes.delete(id);
}

/**
 * Clones a saved resume under a new id and labels it " (Copy)". The saved
 * document itself is never mutated, so the original row keeps its own name and
 * history. Returns `null` when the source row is already gone.
 */
export async function duplicateResume(id: string): Promise<ResumeRow | null> {
  const row = await getResume(id);

  if (!row) {
    return null;
  }

  const baseName = row.doc.basics.name.trim();
  const name = `${baseName === "" ? UNTITLED_RESUME : baseName} (Copy)`;

  const copy: ResumeRow = {
    id: newId(),
    updatedAt: Date.now(),
    doc: {
      ...row.doc,
      basics: { ...row.doc.basics, name },
    },
    status: row.status,
    targetCompany: row.targetCompany,
  };

  await putResume(copy);

  return copy;
}

/**
 * Renames a saved resume by writing the new name into `basics.name`. The tag
 * only applies when the row still exists, so a stale list entry cannot resurrect
 * a deleted resume.
 */
export async function renameResume(
  id: string,
  name: string,
): Promise<ResumeRow | null> {
  const row = await getResume(id);

  if (!row) {
    return null;
  }

  const next: ResumeRow = {
    ...row,
    updatedAt: Date.now(),
    doc: {
      ...row.doc,
      basics: { ...row.doc.basics, name },
    },
  };

  await putResume(next);

  return next;
}
