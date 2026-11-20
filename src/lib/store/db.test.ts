import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import {
  deleteResume,
  duplicateResume,
  getResume,
  listRecentResumes,
  putResume,
  renameResume,
  resumeDb,
  type ResumeRow,
} from "./db";

function row(id: string, updatedAt: number, name: string): ResumeRow {
  const doc = createEmptyResume();

  doc.basics.name = name;

  return { id, updatedAt, doc };
}

beforeEach(async () => {
  await resumeDb.resumes.clear();
});

describe("listRecentResumes", () => {
  it("returns the newest saves first and respects the limit", async () => {
    await putResume(row("old", 1_000, "Old Resume"));
    await putResume(row("new", 3_000, "New Resume"));
    await putResume(row("middle", 2_000, "Middle Resume"));

    const recent = await listRecentResumes(2);

    expect(recent.map((item) => item.id)).toEqual(["new", "middle"]);
  });

  it("returns an empty list when nothing is saved", async () => {
    expect(await listRecentResumes()).toEqual([]);
  });
});

describe("renameResume", () => {
  it("writes the new name into basics and bumps updatedAt", async () => {
    await putResume(row("one", 1_000, "Old Name"));

    const updated = await renameResume("one", "New Name");

    expect(updated?.doc.basics.name).toBe("New Name");
    expect(updated?.updatedAt).toBeGreaterThan(1_000);
    expect((await getResume("one"))?.doc.basics.name).toBe("New Name");
  });

  it("ignores a resume that was already deleted", async () => {
    expect(await renameResume("missing", "New Name")).toBeNull();
    expect(await getResume("missing")).toBeUndefined();
  });
});

describe("duplicateResume", () => {
  it("clones the document under a new id and labels it as a copy", async () => {
    await putResume(row("source", 1_000, "Grace Hopper"));

    const copy = await duplicateResume("source");

    expect(copy).not.toBeNull();
    expect(copy?.id).not.toBe("source");
    expect(copy?.doc.basics.name).toBe("Grace Hopper (Copy)");
    expect(copy?.updatedAt).toBeGreaterThan(1_000);
    expect((await getResume(copy!.id))?.doc.basics.name).toBe(
      "Grace Hopper (Copy)",
    );

    const original = await getResume("source");
    expect(original?.doc.basics.name).toBe("Grace Hopper");
  });

  it("names an untitled copy instead of prefixing an empty string", async () => {
    await putResume(row("source", 1_000, ""));

    const copy = await duplicateResume("source");

    expect(copy?.doc.basics.name).toBe("Untitled resume (Copy)");
  });

  it("ignores a resume that was already deleted", async () => {
    expect(await duplicateResume("missing")).toBeNull();
  });
});

describe("deleteResume", () => {
  it("removes only the requested resume", async () => {
    await putResume(row("keep", 1_000, "Keep"));
    await putResume(row("drop", 2_000, "Drop"));

    await deleteResume("drop");

    expect(await getResume("drop")).toBeUndefined();
    expect(await getResume("keep")).toBeDefined();
  });
});
