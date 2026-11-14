import type { StoreApi } from "zustand";
import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";

import { createEmptyResume, newId } from "@/lib/schema/defaults";
import type {
  ResumeDocument,
  TemplateId,
} from "@/lib/schema/resume.schema";

import { getResume, putResume } from "./db";

export type SaveState = "idle" | "saving" | "error";

export type DeepPartial<T> = T extends (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type ResumeStore = {
  doc: ResumeDocument;
  resumeId: string | null;
  hydrated: boolean;
  lastSavedAt: number | null;
  saveState: SaveState;
  setDoc(next: ResumeDocument): void;
  patchDoc(patch: DeepPartial<ResumeDocument>): void;
  createResume(template?: TemplateId): Promise<string>;
  loadResume(id: string): Promise<boolean>;
  saveNow(): Promise<void>;
  importResume(doc: ResumeDocument): Promise<string>;
  setSaveState(state: SaveState): void;
  markHydrated(): void;
};

type HistoryState = { doc: ResumeDocument };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined) {
    return base;
  }

  if (Array.isArray(patch)) {
    return patch as T;
  }

  if (isPlainObject(patch)) {
    if (!isPlainObject(base)) {
      return patch as T;
    }

    const result: Record<string, unknown> = { ...base };

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        continue;
      }

      result[key] = deepMerge(result[key], value);
    }

    return result as T;
  }

  return patch as T;
}

export const useResumeStore = create<ResumeStore>()(
  temporal(
    (set, get) => ({
      doc: createEmptyResume(),
      resumeId: null,
      hydrated: false,
      lastSavedAt: null,
      saveState: "idle",

      setDoc: (next) => set({ doc: next }),

      patchDoc: (patch) => {
        const current = get().doc;
        const next = deepMerge(current, patch);

        // Forms resync their watched values after an external change such as
        // undo, then debounce a patch with the same content. Skip that no-op so
        // it cannot replace the document reference or clear redo history.
        if (JSON.stringify(next) === JSON.stringify(current)) {
          return;
        }

        set({ doc: next });
      },

      createResume: async (template) => {
        const doc = createEmptyResume(template);
        const id = newId();

        await putResume({ id, updatedAt: Date.now(), doc });

        const history = getTemporal();
        history.pause();
        set({ doc, resumeId: id, hydrated: true });
        history.clear();
        history.resume();

        return id;
      },

      loadResume: async (id) => {
        const row = await getResume(id);

        if (!row) {
          return false;
        }

        const history = getTemporal();
        history.pause();
        set({
          doc: row.doc,
          resumeId: id,
          hydrated: true,
          lastSavedAt: row.updatedAt,
        });
        history.clear();
        history.resume();

        return true;
      },

      saveNow: async () => {
        const { doc, resumeId } = get();

        if (!resumeId) {
          return;
        }

        set({ saveState: "saving" });

        try {
          await putResume({ id: resumeId, updatedAt: Date.now(), doc });
          set({ lastSavedAt: Date.now(), saveState: "idle" });
        } catch {
          set({ saveState: "error" });
        }
      },

      importResume: async (doc) => {
        const id = newId();
        const updatedAt = Date.now();

        await putResume({ id, updatedAt, doc });

        const history = getTemporal();
        history.pause();
        set({ doc, resumeId: id, hydrated: true, lastSavedAt: updatedAt });
        history.clear();
        history.resume();

        return id;
      },

      setSaveState: (state) => set({ saveState: state }),

      markHydrated: () => set({ hydrated: true }),
    }),
    {
      limit: 100,
      partialize: (state) => ({ doc: state.doc }),
      equality: (pastState, currentState) =>
        pastState.doc === currentState.doc,
    },
  ),
);

function getTemporal(): TemporalState<HistoryState> {
  const store = useResumeStore.temporal as StoreApi<TemporalState<HistoryState>>;
  return store.getState();
}

const AUTOSAVE_DEBOUNCE_MS = 300;

let autosaveUnsubscribe: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let savePending = false;

function clearSaveTimer(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

async function flushPendingSave(): Promise<void> {
  if (!savePending) {
    return;
  }

  savePending = false;
  clearSaveTimer();

  const { doc, resumeId } = useResumeStore.getState();

  if (!resumeId) {
    return;
  }

  useResumeStore.getState().setSaveState("saving");

  try {
    await putResume({ id: resumeId, updatedAt: Date.now(), doc });
    useResumeStore.setState({ lastSavedAt: Date.now(), saveState: "idle" });
  } catch {
    useResumeStore.getState().setSaveState("error");
  }
}

function scheduleSave(): void {
  savePending = true;
  clearSaveTimer();
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushPendingSave();
  }, AUTOSAVE_DEBOUNCE_MS);
}

function handleVisibilityChange(): void {
  if (
    typeof document !== "undefined" &&
    document.visibilityState === "hidden"
  ) {
    void flushPendingSave();
  }
}

function handlePageHide(): void {
  void flushPendingSave();
}

export function startAutosave(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (autosaveUnsubscribe) {
    return;
  }

  autosaveUnsubscribe = useResumeStore.subscribe((state, previousState) => {
    if (!state.resumeId || state.doc === previousState.doc) {
      return;
    }

    scheduleSave();
  });

  window.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handlePageHide);
}

export function stopAutosave(): void {
  clearSaveTimer();
  savePending = false;

  if (autosaveUnsubscribe) {
    autosaveUnsubscribe();
    autosaveUnsubscribe = null;
  }

  if (typeof window !== "undefined") {
    window.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
  }
}

export function canUndo(): boolean {
  return getTemporal().pastStates.length > 0;
}

export function canRedo(): boolean {
  return getTemporal().futureStates.length > 0;
}

export function undo(): void {
  getTemporal().undo();
}

export function redo(): void {
  getTemporal().redo();
}

export function resetResumeStore(): void {
  stopAutosave();

  const history = getTemporal();
  history.pause();

  useResumeStore.setState({
    doc: createEmptyResume(),
    resumeId: null,
    hydrated: false,
    lastSavedAt: null,
    saveState: "idle",
  });

  history.clear();
  history.resume();
}
