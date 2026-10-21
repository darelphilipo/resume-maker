import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import { getResume, listResumes, putResume, resumeDb } from "./db";
import {
  canRedo,
  canUndo,
  redo,
  resetResumeStore,
  startAutosave,
  stopAutosave,
  undo,
  useResumeStore,
} from "./useResumeStore";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

beforeEach(async () => {
  resetResumeStore();
  await resumeDb.resumes.clear();
});

describe("createResume", () => {
  it("persists a row and sets resumeId and hydrated", async () => {
    const id = await useResumeStore.getState().createResume();

    const row = await getResume(id);

    expect(row).toBeDefined();
    expect(row?.doc).toEqual(useResumeStore.getState().doc);
    expect(useResumeStore.getState().resumeId).toBe(id);
    expect(useResumeStore.getState().hydrated).toBe(true);
    expect(await listResumes()).toHaveLength(1);
  });
});

describe("loadResume", () => {
  it("restores an existing document", async () => {
    const id = await useResumeStore.getState().createResume();
    const doc = createEmptyResume("onyx");
    doc.basics.name = "Ada Lovelace";
    await putResume({ id, updatedAt: Date.now(), doc });

    resetResumeStore();
    const loaded = await useResumeStore.getState().loadResume(id);

    expect(loaded).toBe(true);
    expect(useResumeStore.getState().doc.basics.name).toBe("Ada Lovelace");
    expect(useResumeStore.getState().resumeId).toBe(id);
    expect(useResumeStore.getState().hydrated).toBe(true);
  });

  it("returns false for an unknown id and leaves the doc untouched", async () => {
    const doc = createEmptyResume();
    doc.basics.name = "Keep me";
    useResumeStore.getState().setDoc(doc);

    const loaded = await useResumeStore.getState().loadResume("does-not-exist");

    expect(loaded).toBe(false);
    expect(useResumeStore.getState().doc).toBe(doc);
    expect(useResumeStore.getState().resumeId).toBeNull();
  });
});

describe("autosave", () => {
  it("debounces rapid patches and persists the latest doc once", async () => {
    await useResumeStore.getState().createResume();
    startAutosave();

    useResumeStore.getState().patchDoc({ basics: { name: "First" } });
    useResumeStore.getState().patchDoc({ basics: { name: "Latest" } });

    await sleep(350);

    const rows = await listResumes();
    expect(rows).toHaveLength(1);
    expect(rows[0].doc.basics.name).toBe("Latest");
    expect(useResumeStore.getState().saveState).toBe("idle");
    expect(useResumeStore.getState().lastSavedAt).toEqual(expect.any(Number));

    stopAutosave();
  });
});

describe("undo/redo", () => {
  it("restores the previous doc and reapplies on redo", () => {
    const base = createEmptyResume();
    base.basics.name = "Base";
    useResumeStore.getState().setDoc(base);

    useResumeStore.getState().patchDoc({ basics: { name: "One" } });
    const firstDoc = useResumeStore.getState().doc;
    useResumeStore.getState().patchDoc({ basics: { name: "Two" } });

    expect(canUndo()).toBe(true);

    undo();
    expect(useResumeStore.getState().doc).toEqual(firstDoc);
    expect(useResumeStore.getState().doc.basics.name).toBe("One");

    redo();
    expect(useResumeStore.getState().doc.basics.name).toBe("Two");
  });

  it("has no undo history on a fresh store", () => {
    expect(canUndo()).toBe(false);
    expect(canRedo()).toBe(false);
  });

  it("does not create history for save state or hydration changes", () => {
    const base = createEmptyResume();
    base.basics.name = "Base";
    useResumeStore.getState().setDoc(base);
    useResumeStore.getState().patchDoc({ basics: { name: "Changed" } });

    expect(canUndo()).toBe(true);

    useResumeStore.getState().setSaveState("saving");
    useResumeStore.getState().markHydrated();

    expect(canUndo()).toBe(true);
    expect(useResumeStore.getState().doc.basics.name).toBe("Changed");

    undo();
    expect(useResumeStore.getState().doc.basics.name).toBe("Base");
  });

  it("does not record history during createResume or loadResume", async () => {
    const id = await useResumeStore.getState().createResume();
    expect(canUndo()).toBe(false);

    const loaded = await useResumeStore.getState().loadResume(id);
    expect(loaded).toBe(true);
    expect(canUndo()).toBe(false);
  });
});

describe("patchDoc", () => {
  it("deep-merges plain objects and keeps untouched fields", () => {
    const doc = createEmptyResume();
    doc.basics.email = "ada@example.com";
    doc.basics.phone = "555-0100";
    useResumeStore.getState().setDoc(doc);

    useResumeStore.getState().patchDoc({ basics: { name: "Ada" } });

    const next = useResumeStore.getState().doc;
    expect(next.basics.name).toBe("Ada");
    expect(next.basics.email).toBe("ada@example.com");
    expect(next.basics.phone).toBe("555-0100");
    expect(next.metadata).toEqual(doc.metadata);
  });

  it("replaces arrays instead of merging them", () => {
    const doc = createEmptyResume();
    doc.metadata.layout.pages[0].sidebar = ["skills"];
    useResumeStore.getState().setDoc(doc);

    useResumeStore.getState().patchDoc({
      metadata: { layout: { pages: [] } },
    });

    expect(useResumeStore.getState().doc.metadata.layout.pages).toEqual([]);
  });
});
