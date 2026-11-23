import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ANONYMIZED_NAME } from "@/lib/privacy/anonymizeDoc";
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
    scanHighlight,
    onZoomChange,
  }: {
    mode?: string;
    doc: ResumeDocument;
    scanHighlight?: boolean;
    onZoomChange?: (zoomed: boolean) => void;
  }) => (
    <div
      data-testid="preview-canvas"
      data-mode={mode}
      data-scan-highlight={scanHighlight ? "true" : "false"}
    >
      <span data-testid="canvas-name">{doc.basics.name}</span>
      {/* The real viewport reports its transformed scale; these stand-ins let
          the workspace tests drive the conditional Reset pill. */}
      <button
        type="button"
        onClick={() => {
          onZoomChange?.(true);
        }}
      >
        Simulate preview zoom
      </button>
      <button
        type="button"
        onClick={() => {
          onZoomChange?.(false);
        }}
      >
        Simulate preview fit
      </button>
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
  document.title = "Resume Maker";
  resetResumeStore();
  loadResumeMock.mockReset().mockResolvedValue(true);
  useResumeStore.setState({ loadResume: loadResumeMock });
});

async function renderReadyWorkspace() {
  const view = render(<EditorWorkspace />);

  await screen.findByRole("heading", { name: "Untitled resume" });

  return view;
}

/** Basics starts collapsed; editing its fields requires opening the card. */
function expandBasics(): void {
  fireEvent.click(screen.getByRole("button", { name: /Basics/ }));
}

/** The two review lenses now live behind the single Review pill in the bar. */
function openReviewMenu(): void {
  fireEvent.click(screen.getByRole("button", { name: "Review" }));
}

describe("EditorWorkspace", () => {
  it("updates the header name while typing, without waiting for a blur", async () => {
    const user = userEvent.setup();
    await renderReadyWorkspace();
    expandBasics();

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
    expandBasics();

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

  it("anonymizes only the preview and leaves the saved resume untouched", async () => {
    await renderReadyWorkspace();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Grace Hopper" },
    });
    expect(screen.getByTestId("canvas-name")).toHaveTextContent("Grace Hopper");

    openReviewMenu();
    const toggle = screen.getByRole("switch", { name: "Anonymize" });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(
      document.querySelector("[data-anonymize-banner]"),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    // The center canvas switches to the alias, but the editor header keeps the
    // real resume name and the store still holds the unsaved draft.
    expect(screen.getByTestId("canvas-name")).toHaveTextContent(ANONYMIZED_NAME);
    expect(
      screen.getByRole("heading", { level: 1, name: "Grace Hopper" }),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-anonymize-banner]")).toHaveTextContent(
      "your saved resume is unchanged",
    );
    expect(useResumeStore.getState().doc.basics.name).toBe("");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("canvas-name")).toHaveTextContent("Grace Hopper");
    expect(
      document.querySelector("[data-anonymize-banner]"),
    ).not.toBeInTheDocument();
  });

  it("toggles the session-only 6-second recruiter scan in the preview", async () => {
    await renderReadyWorkspace();

    openReviewMenu();
    const toggle = screen.getByRole("switch", { name: "6s Scan" });
    const canvas = screen.getByTestId("preview-canvas");

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(canvas).toHaveAttribute("data-scan-highlight", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(canvas).toHaveAttribute("data-scan-highlight", "true");
    // Session-only: the scan is a preview lens, never a document edit.
    expect(useResumeStore.getState().doc.metadata.template).toBe("onyx");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(canvas).toHaveAttribute("data-scan-highlight", "false");
  });

  it("keeps the browser tab synced to the resume name while editing", async () => {
    const doc = createEmptyResume();

    doc.basics.name = "Daniel Okafor";
    useResumeStore.setState({ doc });

    render(<EditorWorkspace />);
    await screen.findByRole("heading", {
      level: 1,
      name: "Daniel Okafor",
    });

    expect(document.title).toBe("Daniel Okafor - Resume");

    expandBasics();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Daniel Okafor Jr." },
    });

    expect(document.title).toBe("Daniel Okafor Jr. - Resume");
  });

  it("uses the anonymized name in the tab title and restores the app name", async () => {
    const doc = createEmptyResume();

    doc.basics.name = "Grace Hopper";
    useResumeStore.setState({ doc });

    const { unmount } = render(<EditorWorkspace />);

    await screen.findByRole("heading", {
      level: 1,
      name: "Grace Hopper",
    });

    expect(document.title).toBe("Grace Hopper - Resume");

    openReviewMenu();
    fireEvent.click(screen.getByRole("switch", { name: "Anonymize" }));

    expect(document.title).toBe(`${ANONYMIZED_NAME} - Resume`);

    unmount();

    expect(document.title).toBe("Resume Maker");
  });

  it("uses the anonymized name in the captured print filename", async () => {
    const doc = createEmptyResume();

    doc.basics.name = "Grace Hopper";
    useResumeStore.setState({ doc });

    const titles: string[] = [];
    const print = vi.spyOn(window, "print").mockImplementation(() => {
      titles.push(document.title);
      window.dispatchEvent(new Event("afterprint"));
    });

    try {
      render(<EditorWorkspace />);

      await screen.findByRole("heading", {
        level: 1,
        name: "Grace Hopper",
      });

      openReviewMenu();
      fireEvent.click(screen.getByRole("switch", { name: "Anonymize" }));
      fireEvent.click(screen.getByRole("button", { name: "Save PDF" }));

      await waitFor(() => expect(print).toHaveBeenCalledTimes(1), {
        timeout: 3000,
      });

      expect(titles[0]).toMatch(/^alex-taylor-.*-resume$/);
      // The real name only lives in the saved doc, never in the print title.
      expect(titles[0]).not.toContain("grace-hopper");
      expect(useResumeStore.getState().doc.basics.name).toBe("Grace Hopper");
    } finally {
      print.mockRestore();
    }
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

  it("starts with Basics collapsed so the section list is visible", async () => {
    await renderReadyWorkspace();

    const toggle = screen.getByRole("button", { name: /^Basics/ });
    const body = document.getElementById("basics-body");

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body).toHaveAttribute("hidden");
    // Summary and the standard sections are the first thing in Content.
    expect(
      screen.getByRole("button", { name: /^Summary/ }),
    ).toBeInTheDocument();
  });

  it("expands Basics from its header and keeps the live name path working", async () => {
    const user = userEvent.setup();

    await renderReadyWorkspace();

    const toggle = screen.getByRole("button", { name: /^Basics/ });
    const body = document.getElementById("basics-body");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(body).not.toHaveAttribute("hidden");
    expect(screen.getByLabelText("Name")).toBeVisible();
  });

  it("gives Bullet polish and Match JD matching quiet pill styling", async () => {
    await renderReadyWorkspace();

    const bullet = screen.getByRole("button", { name: /Bullet polish:/ });
    const match = screen.getByRole("button", {
      name: "Match to a job description",
    });

    for (const trigger of [bullet, match]) {
      expect(trigger).toHaveClass(
        "rounded-full",
        "border-line",
        "bg-surface",
        "min-h-9",
        "text-xs",
      );
      expect(trigger).not.toHaveClass("bg-primary");
    }

    // The job-description trigger used to be the only white, semibold pill.
    expect(match).not.toHaveClass("bg-white", "font-semibold");
  });

  it("reserves the preview scrollbar gutter so the fit width cannot jitter", async () => {
    await renderReadyWorkspace();

    const preview = screen.getByRole("tabpanel", { name: "Preview" });

    expect(preview).toHaveClass(
      "lg:overflow-y-auto",
      "[scrollbar-gutter:stable]",
    );
    // Only the Preview column is a fit-measured scroll region; the other two
    // keep their natural gutter behaviour.
    for (const name of ["Content", "Design"]) {
      expect(screen.getByRole("tabpanel", { name })).not.toHaveClass(
        "[scrollbar-gutter:stable]",
      );
    }
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
    // grid and each column owns the only scrollbar along the right edge. On
    // phones the same shell is fixed to the viewport, so a focused control or
    // a canvas re-measure can never scroll the document and shift the bottom
    // nav into mid-screen.
    expect(shell).toHaveClass(
      "fixed",
      "inset-0",
      "h-dvh",
      "overflow-hidden",
      "lg:static",
      "lg:h-dvh",
    );
    expect(shell).not.toHaveClass(
      "lg:h-auto",
      "lg:overflow-visible",
      "absolute",
    );
    expect(main).toHaveClass("min-h-0", "flex-1", "lg:overflow-hidden");
    expect(main).not.toHaveClass("lg:overflow-visible");

    for (const panel of panels) {
      expect(panel).toHaveClass(...columnClasses);
      expect(panel).not.toHaveClass("lg:sticky");
      // Scrolling stays desktop-only; mobile keeps one tab panel at a time.
      expect(panel).not.toHaveClass("sticky", "overflow-y-auto");
    }

    // Short Content/Design cards are vertically balanced on tall tablets and
    // capped at a readable width; the preview keeps the full stage width.
    for (const panel of panels.slice(0, 2)) {
      expect(panel).toHaveClass(
        "my-auto",
        "max-w-3xl",
        "self-center",
        "lg:my-0",
        "lg:max-w-none",
        "lg:self-stretch",
      );
    }
    expect(panels[2]).not.toHaveClass("my-auto", "max-w-3xl");
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
    // The zero-AI bullet check sits beside Match JD in the same row.
    expect(titleRow).toContainElement(
      screen.getByRole("button", { name: /Bullet polish:/ }),
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
    const backup = screen.getByRole("button", { name: "Backup and export" });

    expect(redo).toBeDisabled();
    expect(redo).toHaveClass("disabled:text-text/80", "disabled:opacity-100");
    expect(redo).not.toHaveClass("disabled:text-muted");
    // The backup menu is a quiet secondary action after the primary CTA; it no
    // longer shows an outlined "Export JSON" label competing with Save PDF.
    expect(
      printButton.compareDocumentPosition(backup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(backup).toHaveClass("border-transparent", "text-muted");
    expect(backup).not.toHaveTextContent("Export JSON");
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
    const heading = screen.getByRole("heading", { name: "Preview" });

    expect(header).not.toBeNull();
    // Compact on phones; sticky only while the desktop panel scrolls.
    expect(header).toHaveClass("shrink-0", "z-10", "min-h-10", "lg:min-h-14");
    expect(header).toHaveClass("lg:sticky", "lg:top-0", "lg:z-20");
    expect(header).not.toHaveClass("sticky");
    // The active bottom tab already says Preview, so the heading is desktop-only.
    expect(heading).toHaveClass("hidden", "lg:block");
    expect(header).toContainElement(visual);
    expect(header).toContainElement(screen.getByRole("button", { name: "ATS text" }));
    // The visible label is short enough for 390px; the accessible name keeps
    // the full "ATS text" wording.
    expect(screen.getByRole("button", { name: "ATS text" })).toHaveTextContent(
      /^ATS$/,
    );
    // There is no second preview toolbar row any more.
    expect(
      document.querySelector("[data-preview-header]"),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector("[data-canvas-toolbar]"),
    ).not.toBeInTheDocument();
  });

  it("keeps the mobile preview controls in one compact, scrollable pill row", async () => {
    await renderReadyWorkspace();

    const visual = screen.getByRole("button", { name: "Visual" });
    const header = visual.closest<HTMLElement>("[data-preview-mode-header]")!;
    const controls = [visual, screen.getByRole("button", { name: "ATS text" })];
    const review = screen.getByRole("button", { name: "Review" });

    // One tight row that scrolls sideways instead of wrapping into several
    // stacked rows that would eat the resume preview height. The review lenses
    // no longer crowd it: they live behind the single Review pill.
    expect(header).toHaveClass(
      "flex-nowrap",
      "overflow-x-auto",
      "no-scrollbar",
    );
    expect(header).toHaveClass("lg:flex-wrap", "lg:overflow-visible");

    for (const control of [...controls, review]) {
      expect(control).toHaveClass("h-8", "text-xs", "px-2.5");
    }
    expect(header.querySelector("[data-preview-toolbar-divider]")).toBeNull();
    expect(
      screen.queryByRole("switch", { name: "6s Scan" }),
    ).not.toBeInTheDocument();
  });

  it("shows a subtle 1-page label in the top bar instead of an extra chrome row", async () => {
    await renderReadyWorkspace();

    const visual = screen.getByRole("button", { name: "Visual" });
    const header = visual.closest<HTMLElement>("[data-preview-mode-header]")!;
    const label = header.querySelector<HTMLElement>("[data-preview-page-label]");
    const review = screen.getByRole("button", { name: "Review" });

    expect(label).toHaveTextContent("1 page");
    expect(label).toHaveClass("text-xs", "text-muted");
    expect(label!.compareDocumentPosition(review) &
      Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("marks the Review pill when a review tool is active", async () => {
    await renderReadyWorkspace();

    const review = screen.getByRole("button", { name: "Review" });

    expect(review).toHaveAttribute("aria-expanded", "false");
    expect(
      document.querySelector("[data-review-active-dot]"),
    ).not.toBeInTheDocument();

    openReviewMenu();
    fireEvent.click(screen.getByRole("switch", { name: "6s Scan" }));

    expect(screen.getByRole("button", { name: /Review, active/ })).toBeVisible();
    expect(document.querySelector("[data-review-active-dot]")).toBeVisible();
  });

  it("keeps the zoom Reset pill in the same row only while the canvas is zoomed", async () => {
    await renderReadyWorkspace();

    const header = screen
      .getByRole("button", { name: "Visual" })
      .closest<HTMLElement>("[data-preview-mode-header]")!;

    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Simulate preview zoom" }),
    );

    const reset = screen.getByRole("button", { name: "Reset preview zoom" });

    // The reset joins the single mode row instead of opening a second one.
    expect(header).toContainElement(reset);
    expect(reset).toHaveClass("h-8", "text-xs", "px-2.5");

    fireEvent.click(
      screen.getByRole("button", { name: "Simulate preview fit" }),
    );
    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();
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
