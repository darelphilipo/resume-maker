import Dexie, { type EntityTable } from "dexie";

import type { ResumeDocument } from "@/lib/schema/resume.schema";

export type ResumeRow = {
  id: string;
  updatedAt: number;
  doc: ResumeDocument;
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
