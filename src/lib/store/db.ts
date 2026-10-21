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
