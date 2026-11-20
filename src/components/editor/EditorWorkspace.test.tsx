import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
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
  LiveCanvasViewport: ({
    mode,
    doc,
  }: {
    mode?: string;
    doc: ResumeDocument;
  }) => (
    <div data-testid="preview-canvas" data-mode={mode}>
      <span data-testid="canvas-name">{doc.basics.name}</span>
    </div>
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
  it("updates the header name while typing, without waiting for a blur", async () => {
    const user = userEvent.setup();
    await renderReadyWorkspace();

    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Ada Lovelace" }),
      ).toBeInTheDocument();
    });
  });

  it("syncs live Name edits to the preview canvas and header without a blur", async () => {
    const user = userEvent.setup();
    await renderReadyWorkspace();

    // Both surfaces render from the same committed doc, not a local draft, so
    // a keystroke reaches the center resume header and the top bar title.
    await user.type(screen.getByLabelText("Name"), "Grace Hopper");

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Grace Hopper" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("canvas-name")).toHaveTextContent(
        "Grace Hopper",
      );
    });
  });

  it("follows a Name keystroke in the header and preview before the debounced commit", async () => {
    await renderReadyWorkspace();

    // A fast typist keeps resetting the 50 ms commit, so the committed doc is
    // still empty at this point. The live override must already be visible in
    // both surfaces without waiting for a timer or a blur.
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Grace" },
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Grace" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("canvas-name")).toHaveTextContent("Grace");
    expect(useResumeStore.getState().doc.basics.name).toBe("");
  });

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

  it("locks the desktop shell and scrolls each column independently", async () => {
    await renderReadyWorkspace();

    const main = screen.getByRole("main");
    const shell = main.parentElement;
    const panels = [
      screen.getByRole("tabpanel", { name: "Content" }),
      screen.getByRole("tabpanel", { name: "Design" }),
      screen.getByRole("tabpanel", { name: "Preview" }),
    ];
    const columnClasses = [
      "lg:h-full",
      "lg:min-h-0",
      "lg:overflow-y-auto",
      "lg:overscroll-contain",
    ];

    // A viewport-tall shell removes the document scrollbar; <main> clips its
    // grid and each column owns the only scrollbar along the right edge.
    expect(shell).toHaveClass("h-dvh", "overflow-hidden");
    expect(shell).not.toHaveClass("lg:h-auto", "lg:overflow-visible");
    expect(main).toHaveClass("min-h-0", "flex-1", "lg:overflow-hidden");
    expect(main).not.toHaveClass("lg:overflow-visible");

    for (const panel of panels) {
      expect(panel).toHaveClass(...columnClasses);
      expect(panel).not.toHaveClass("lg:sticky");
      // Scrolling stays desktop-only; mobile keeps one tab panel at a time.
      expect(panel).not.toHaveClass("sticky", "overflow-y-auto");
    }
  });

  it("opens the job description keyword matcher from the content panel header", async () => {
    const user = userEvent.setup();

    await renderReadyWorkspace();

    const trigger = screen.getByRole("button", {
      name: "Match to a job description",
    });
    // The trigger is surfaced in the Content panel header (not buried in the
    // form body) so it is equally reachable on desktop and in the mobile tab.
    const header = trigger.closest("[data-content-header]");
    expect(header).not.toBeNull();
    // It shares a row with the Content heading; the description sits on the
    // next line instead of wrapping the button onto a second row on phones.
    const titleRow = trigger.closest("[data-content-title-row]");
    expect(titleRow).not.toBeNull();
    expect(titleRow).toContainElement(
      screen.getByRole("heading", { name: "Content" }),
    );

    await user.click(trigger);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Job description")).toBeInTheDocument();
  });

  it("calls undo from the top bar", async () => {
    const user = userEvent.setup();

    await renderReadyWorkspace();

    const undoButton = screen.getByRole("button", { name: "Undo" });

    expect(undoButton).toBeEnabled();
    await user.click(undoButton);

    expect(storeFunctions.undo).toHaveBeenCalledTimes(1);
  });

  it("keeps the resume name and print action on one compact header row", async () => {
    await renderReadyWorkspace();

    const heading = screen.getByRole("heading", { name: "Untitled resume" });
    const header = heading.closest("header");
    const row = header?.firstElementChild;
    const printButton = screen.getByRole("button", { name: "Save PDF" });

    expect(header).not.toBeNull();
    expect(row).not.toBeNull();
    expect(row).toHaveClass("flex-nowrap");
    expect(row).toContainElement(printButton);
    expect(heading.parentElement).not.toHaveClass("basis-24");
    expect(printButton).toHaveClass(
      "min-w-10",
      "shrink-0",
      "bg-primary",
      "text-white",
    );
    expect(screen.getByRole("button", { name: "Undo" })).toHaveClass(
      "min-w-10",
      "shrink-0",
    );
    const redo = screen.getByRole("button", { name: "Redo" });

    expect(redo).toBeDisabled();
    expect(redo).toHaveClass("disabled:text-muted", "disabled:opacity-100");
    // The divider sits between Back and the title, not in the action group.
    const divider = row?.querySelector<HTMLElement>("[data-header-divider]");

    expect(divider).not.toBeNull();
    expect(divider!.compareDocumentPosition(heading) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider!.compareDocumentPosition(printButton) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("switches the preview between the canvas and ATS plain text", async () => {
    const user = userEvent.setup();

    await renderReadyWorkspace();

    const canvas = screen.getByTestId("preview-canvas");
    const visual = screen.getByRole("button", { name: "Visual" });
    const ats = screen.getByRole("button", { name: "ATS text" });

    expect(visual).toHaveAttribute("aria-pressed", "true");
    expect(ats).toHaveAttribute("aria-pressed", "false");
    expect(canvas).toHaveAttribute("data-mode", "canvas");

    await user.click(ats);

    expect(visual).toHaveAttribute("aria-pressed", "false");
    expect(ats).toHaveAttribute("aria-pressed", "true");
    expect(canvas).toHaveAttribute("data-mode", "ats");
  });

  it("keeps the preview mode toggle in a fixed header above the canvas", async () => {
    await renderReadyWorkspace();

    const visual = screen.getByRole("button", { name: "Visual" });
    const header = visual.closest("[data-preview-mode-header]");

    expect(header).not.toBeNull();
    // Fixed on phones; sticky only while the desktop panel scrolls.
    expect(header).toHaveClass("shrink-0", "z-10", "min-h-14");
    expect(header).toHaveClass("lg:sticky", "lg:top-0", "lg:z-20");
    expect(header).not.toHaveClass("sticky");
    expect(header).toContainElement(visual);
    expect(header).toContainElement(screen.getByRole("button", { name: "ATS text" }));
  });

  it("makes the mobile preview a fixed-height column above a scrolling canvas", async () => {
    const user = userEvent.setup();

    await renderReadyWorkspace();

    // The preview panel is the active mobile tab; inactive panels are `hidden`.
    await user.click(screen.getByRole("tab", { name: "Preview" }));

    const main = screen.getByRole("main");
    const preview = screen.getByRole("tabpanel", { name: "Preview" });
    const canvas = screen.getByTestId("preview-canvas");
    const stage = canvas.parentElement;
    const header = screen
      .getByRole("button", { name: "Visual" })
      .closest<HTMLElement>("[data-preview-mode-header]");

    // The preview tab fills the available height instead of growing with the
    // page stack, so the canvas gets its own scroll region.
    expect(main).toHaveClass("flex", "flex-col");
    expect(preview).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(stage).not.toBeNull();
    expect(stage).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(stage).toContainElement(canvas);
    // The chrome is the first, non-scrolling row of that column, above the
    // canvas region (whose own scroller is covered by the viewport tests).
    expect(header).not.toBeNull();
    expect(stage!.firstElementChild).toBe(header);
    expect(
      header!.compareDocumentPosition(canvas) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
