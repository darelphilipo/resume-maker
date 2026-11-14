import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { putResume } from "@/lib/store/db";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { EditorWorkspace } from "./EditorWorkspace";

const realLoadResume = useResumeStore.getState().loadResume;

const searchParamsState = vi.hoisted(() => ({
  id: "resume-1" as string | null,
}));

const storeFunctions = vi.hoisted(() => ({
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: vi.fn(() => true),
  canRedo: vi.fn(() => false),
  startAutosave: vi.fn(),
  stopAutosave: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    new URLSearchParams(
      searchParamsState.id ? { id: searchParamsState.id } : undefined,
    ),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/components/preview/LiveCanvasViewport", () => ({
  LiveCanvasViewport: () => (
    <div data-testid="preview-canvas">Preview canvas</div>
  ),
}));

vi.mock("@/lib/store/useResumeStore", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/store/useResumeStore")>();

  return {
    ...actual,
    undo: storeFunctions.undo,
    redo: storeFunctions.redo,
    canUndo: storeFunctions.canUndo,
    canRedo: storeFunctions.canRedo,
    startAutosave: storeFunctions.startAutosave,
    stopAutosave: storeFunctions.stopAutosave,
  };
});

const loadResumeMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsState.id = "resume-1";
  resetResumeStore();
  loadResumeMock.mockReset().mockResolvedValue(true);
  useResumeStore.setState({ loadResume: loadResumeMock });
});

async function renderReadyWorkspace() {
  const view = render(<EditorWorkspace />);

  await screen.findByRole("heading", { name: "Untitled resume" });

  return view;
}

describe("EditorWorkspace", () => {
  it("defaults to the content tab and reveals one panel at a time", async () => {
    const user = userEvent.setup();

    await renderReadyWorkspace();

    const contentTab = screen.getByRole("tab", { name: "Content" });
    const designTab = screen.getByRole("tab", { name: "Design" });
    const contentPanel = screen.getByRole("tabpanel", { name: "Content" });
    const designPanel = screen.getByRole("tabpanel", { name: "Design" });

    expect(contentTab).toHaveAttribute("aria-selected", "true");
    expect(designTab).toHaveAttribute("aria-selected", "false");
    expect(contentPanel).not.toHaveClass("hidden");
    expect(designPanel).toHaveClass("hidden");

    await user.click(designTab);

    expect(designTab).toHaveAttribute("aria-selected", "true");
    expect(contentTab).toHaveAttribute("aria-selected", "false");
    expect(designPanel).not.toHaveClass("hidden");
    expect(contentPanel).toHaveClass("hidden");
    expect(
      screen.getAllByRole("tab").filter((tab) => {
        return tab.getAttribute("aria-selected") === "true";
      }),
    ).toHaveLength(1);
  });

  it("keeps all three tabpanels in the DOM", async () => {
    await renderReadyWorkspace();

    const panels = screen.getAllByRole("tabpanel");

    expect(panels).toHaveLength(3);
    expect(panels.map((panel) => panel.id)).toEqual([
      "panel-content",
      "panel-design",
      "panel-preview",
    ]);
  });

  it("calls undo from the top bar", async () => {
    const user = userEvent.setup();

    await renderReadyWorkspace();

    const undoButton = screen.getByRole("button", { name: "Undo" });

    expect(undoButton).toBeEnabled();
    await user.click(undoButton);

    expect(storeFunctions.undo).toHaveBeenCalledTimes(1);
  });

  it("shows the save state from the store", async () => {
    await renderReadyWorkspace();

    expect(screen.getByText("Not saved")).toBeInTheDocument();

    act(() => {
      useResumeStore.setState({ saveState: "saving" });
    });

    expect(screen.getByText("Saving…")).toBeInTheDocument();

    act(() => {
      useResumeStore.setState({ saveState: "idle", lastSavedAt: Date.now() });
    });

    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows Saved for a resume already persisted in IndexedDB", async () => {
    const updatedAt = 1_700_000_000_000;
    await putResume({
      id: "resume-1",
      updatedAt,
      doc: createEmptyResume(),
    });

    // Use the real loader so the store hydrates lastSavedAt from the row.
    useResumeStore.setState({ loadResume: realLoadResume });

    render(<EditorWorkspace />);

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.queryByText("Not saved")).not.toBeInTheDocument();
  });

  it("starts autosave after loading and stops it on unmount", async () => {
    const { unmount } = await renderReadyWorkspace();

    expect(loadResumeMock).toHaveBeenCalledWith("resume-1");
    expect(storeFunctions.startAutosave).toHaveBeenCalledTimes(1);

    unmount();

    expect(storeFunctions.stopAutosave).toHaveBeenCalled();
  });

  it("shows the no-selection state when the id is missing", () => {
    searchParamsState.id = null;

    render(<EditorWorkspace />);

    expect(
      screen.getByRole("heading", { name: "No resume selected" }),
    ).toBeInTheDocument();
    expect(loadResumeMock).not.toHaveBeenCalled();
  });

  it("shows the not-found state when the resume cannot be loaded", async () => {
    loadResumeMock.mockResolvedValue(false);

    render(<EditorWorkspace />);

    expect(
      await screen.findByRole("heading", { name: "Resume not found" }),
    ).toBeInTheDocument();
    expect(storeFunctions.startAutosave).not.toHaveBeenCalled();
  });
});
