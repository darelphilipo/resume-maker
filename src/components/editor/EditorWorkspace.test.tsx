import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";
import { ANONYMIZED_NAME } from "@/lib/privacy/anonymizeDoc";
import type { ResumeDocument } from "@/lib/schema/resume.schema";
import {
  analyzeBulletLines,
  summarizeBulletIssues,
  type BulletLintReport,
} from "@/lib/lint/bulletMetrics";
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

/** Lets one test publish a synthetic trim report from the mocked canvas. */
const previewState = vi.hoisted(() => ({
  report: null as unknown,
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
    onBulletReport,
  }: {
    mode?: string;
    doc: ResumeDocument;
    scanHighlight?: boolean;
    onBulletReport?: (report: BulletLintReport | null) => void;
  }) => {
    useEffect(() => {
      if (previewState.report) {
        onBulletReport?.(previewState.report as BulletLintReport);
      }
    }, [onBulletReport]);

    return (
      <div
        data-testid="preview-canvas"
        data-mode={mode}
        data-scan-highlight={scanHighlight ? "true" : "false"}
      >
        <span data-testid="canvas-name">{doc.basics.name}</span>
      </div>
    );
  },
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
  previewState.report = null;
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

    expect(document.title).toBe("Daniel_Okafor_Resume");

    expandBasics();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Daniel Okafor Jr." },
    });

    expect(document.title).toBe("Daniel_Okafor_Jr_Resume");
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

    expect(document.title).toBe("Grace_Hopper_Resume");

    openReviewMenu();
    fireEvent.click(screen.getByRole("switch", { name: "Anonymize" }));

    expect(document.title).toBe("Alex_Taylor_Resume");

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

  it("pins the Design heading while its desktop column scrolls", async () => {
    await renderReadyWorkspace();

    const designPanel = screen.getByRole("tabpanel", { name: "Design" });
    const heading = screen.getByRole("heading", { level: 2, name: "Design" });
    const sticky = heading.parentElement as HTMLElement;

    // The panel itself is not sticky (#51), but its heading sticks inside the
    // column's own scroller and carries the card surface so options scroll
    // underneath instead of through it.
    expect(sticky).toHaveClass(
      "lg:sticky",
      "lg:top-0",
      "lg:z-10",
      "lg:bg-surface",
    );
    expect(designPanel).toContainElement(sticky);
  });

  it("gives desktop three thin-scrolling columns with a wider, top-aligned Preview", async () => {
    await renderReadyWorkspace();

    const main = screen.getByRole("main");
    const panels = screen.getAllByRole("tabpanel");

    // Slimmer sidebars and less outer padding hand the width to the live resume.
    expect(main).toHaveClass(
      "lg:grid-cols-[20.5rem_minmax(0,1fr)_18rem]",
      "lg:px-4",
    );
    expect(main).not.toHaveClass(
      "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,20rem)]",
    );

    // All three independent desktop scrollers use the same low-contrast rail.
    for (const panel of panels) {
      expect(panel).toHaveClass("subtle-scroll", "lg:overflow-y-auto");
    }

    const contentHeading = screen.getByRole("heading", {
      level: 2,
      name: "Content",
    });
    const designHeading = screen.getByRole("heading", {
      level: 2,
      name: "Design",
    });
    const previewHeading = screen.getByRole("heading", {
      level: 2,
      name: "Preview",
    });

    // Same type scale, and the Preview row starts at the same 16px inset as the
    // Content/Design card headings. jsdom has no layout, so this class contract
    // is the guard; the real baseline is a Playwright geometry check.
    for (const heading of [contentHeading, designHeading, previewHeading]) {
      expect(heading).toHaveClass(
        "font-serif",
        "text-xl",
        "font-semibold",
        "tracking-tight",
      );
    }
    expect(contentHeading.closest("[data-content-header]")!.parentElement).toHaveClass(
      "p-4",
    );
    expect(designHeading.parentElement).toHaveClass(
      "lg:-mt-4",
      "lg:pt-4",
    );

    const header = screen
      .getByRole("button", { name: "Visual" })
      .closest<HTMLElement>("[data-preview-mode-header]")!;

    expect(header).toHaveClass("lg:items-start", "lg:px-4", "lg:pt-4");
    expect(header).not.toHaveClass("lg:items-center");
    // The paper sits closer to that aligned row instead of a roomy gap.
    expect(header.parentElement).toHaveClass("gap-2");
    expect(header.parentElement).not.toHaveClass("gap-3");
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

  it("closes Basics together with the sections from Collapse all", async () => {
    await renderReadyWorkspace();

    const basics = screen.getByRole("button", { name: /^Basics/ });
    fireEvent.click(basics);
    fireEvent.click(screen.getByRole("button", { name: /^Summary/ }));

    const collapseAll = screen.getByRole("button", { name: "Collapse all" });
    fireEvent.click(collapseAll);

    expect(basics).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("basics-body")).toHaveAttribute("hidden");
    expect(screen.getByRole("button", { name: /^Summary/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("button", { name: "Collapse all" })).toBeNull();
  });

  it("gives the collapsed Basics header the same 44px row height as a section", async () => {
    await renderReadyWorkspace();

    const toggle = screen.getByRole("button", { name: /^Basics/ });
    const label = screen.getByText("Basics");

    expect(toggle).toHaveClass("min-h-11");
    expect(toggle).not.toHaveClass("py-2");
    // The collapsed label reads like a section title, not a muted eyebrow.
    expect(label).toHaveClass("text-sm", "font-medium");
    expect(label).not.toHaveClass("uppercase", "text-muted", "text-xs");
    // A long candidate name truncates, but never squishes the label.
    expect(label).toHaveClass("shrink-0", "whitespace-nowrap");
  });

  it("aligns the Basics row with the section rows below it", async () => {
    await renderReadyWorkspace();

    const toggle = screen.getByRole("button", { name: /^Basics/ });
    const row = toggle.parentElement;
    const grip = document.querySelector('[data-section-action="grip"]');
    const icon = document.querySelector("[data-basics-icon]");

    expect(row).not.toBeNull();
    expect(row).toHaveClass("min-h-11", "gap-1", "px-2", "sm:px-3");
    // The leading spacer matches the drag handle's width so the carets line up.
    expect(icon).toHaveClass(
      "min-w-9",
      "pointer-coarse:min-w-11",
      "shrink-0",
    );
    expect(grip).toHaveClass("min-w-9", "pointer-coarse:min-w-11");
    expect(grip?.parentElement).toHaveClass(
      "min-h-11",
      "gap-1",
      "px-2",
      "sm:px-3",
    );

    // Basics shares the section list's 8px row gap instead of the card gap.
    const basicsSection = document.getElementById("basics-body")?.closest("section");
    const group = basicsSection?.parentElement;
    expect(basicsSection).toHaveClass("bg-background", "border-black/10");
    expect(group).toHaveClass("flex", "flex-col", "gap-2");
  });

  it("gives Tidy and Match JD matching quiet pill styling on one row", async () => {
    await renderReadyWorkspace();

    const bullet = screen.getByRole("button", { name: /Tidy:/ });
    const match = screen.getByRole("button", {
      name: "Match to a job description",
    });

    for (const trigger of [bullet, match]) {
      expect(trigger).toHaveClass(
        "rounded-full",
        "border-line",
        "bg-surface",
        "h-8",
        "px-2.5",
        "text-xs",
        "whitespace-nowrap",
        "pointer-coarse:h-11",
      );
      expect(trigger).not.toHaveClass("bg-primary");
    }

    // Content, Tidy and Match JD share a nowrap row at 390px; only the
    // descriptive line below is allowed to wrap.
    const titleRow = bullet.closest("[data-content-title-row]");
    expect(titleRow?.className).toContain("flex");
    const actions = titleRow?.lastElementChild;
    expect(actions?.className).toContain("flex-nowrap");
    expect(actions?.className).not.toContain("flex-wrap");

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
      screen.getByRole("button", { name: /Tidy:/ }),
    );

    await user.click(trigger);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Job description")).toBeInTheDocument();
  });

  it("jumps from a trim tip to the offending entry in Content", async () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-trim",
        company: "Acme",
        position: "Engineer",
      }),
    ];
    useResumeStore.setState({ doc });

    const issue = analyzeBulletLines([
      "Led the billing migration for the platform and",
      "saved 3 hours",
    ])!;

    previewState.report = summarizeBulletIssues([
      { ...issue, sectionId: "experience", entryId: "exp-trim" },
    ]);

    await renderReadyWorkspace();

    await waitFor(() => {
      expect(
        document.querySelector("[data-review-trim-badge]"),
      ).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Trim tips \(1\)/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Led the billing migration/ }),
    );

    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await waitFor(() => {
      expect(
        document.querySelector('[data-section-toggle="experience"]'),
      ).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById("editor-entry-exp-trim")).not.toBeNull();
    });
  });

  it("jumps from a Tidy repeated-verb card to its entry in Content", async () => {
    const doc = createEmptyResume();

    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-tidy",
        company: "Acme",
        position: "Engineer",
        summary:
          "<ul><li>Collected data.</li><li>Collected reports.</li></ul>",
      }),
    ];
    useResumeStore.setState({ doc });

    await renderReadyWorkspace();

    fireEvent.click(screen.getByRole("button", { name: /Tidy:/ }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Jump to entry for repeated “Collected” bullets",
      }),
    );

    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => {
      expect(
        document.querySelector('[data-section-toggle="experience"]'),
      ).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById("editor-entry-exp-tidy")).not.toBeNull();
    });
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
    const backup = screen.getByRole("button", { name: "Export & options" });

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
    expect(visual).toHaveClass("bg-primary", "text-white");
    expect(ats).not.toHaveClass("bg-primary");
    expect(canvas).toHaveAttribute("data-mode", "canvas");

    await user.click(ats);

    expect(visual).toHaveAttribute("aria-pressed", "false");
    expect(ats).toHaveAttribute("aria-pressed", "true");
    expect(ats).toHaveClass("bg-primary", "text-white");
    expect(visual).not.toHaveClass("bg-primary");
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
    // The mode switch is pinned to the left edge and status/Review to the
    // right, so a changing badge cannot slide `Visual | ATS` sideways.
    expect(header).toHaveClass("justify-between");
    const anchor = header!.querySelector<HTMLElement>("[data-preview-mode-anchor]");
    const actions = header!.querySelector<HTMLElement>("[data-preview-actions]");
    expect(anchor).toHaveClass("flex", "shrink-0");
    expect(header!.firstElementChild).toBe(anchor);
    expect(anchor).toContainElement(heading);
    expect(actions).toHaveClass("flex", "shrink-0");
    expect(header!.lastElementChild).toBe(actions);
    expect(actions).toContainElement(
      header!.querySelector("[data-preview-page-label]")!,
    );
    expect(actions).toContainElement(screen.getByRole("button", { name: "Review" }));
    expect(anchor).not.toContainElement(
      screen.getByRole("button", { name: "Review" }),
    );
    // The active bottom tab already says Preview, so the heading is desktop-only.
    expect(heading).toHaveClass("hidden", "lg:block");
    expect(header).toContainElement(visual);
    expect(header).toContainElement(screen.getByRole("button", { name: "ATS text" }));
    // The visible label is short enough for 390px; the accessible name keeps
    // the full "ATS text" wording.
    expect(screen.getByRole("button", { name: "ATS text" })).toHaveTextContent(
      /^ATS$/,
    );
    expect(screen.getByRole("button", { name: "ATS text" })).toHaveAttribute(
      "title",
      "Plain text & one-click Workday copy",
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

  it("anchors the mode switch on the left while Review badges change", async () => {
    await renderReadyWorkspace();

    const header = screen
      .getByRole("button", { name: "Visual" })
      .closest<HTMLElement>("[data-preview-mode-header]")!;
    const anchor = header.querySelector<HTMLElement>("[data-preview-mode-anchor]")!;
    const actions = header.querySelector<HTMLElement>("[data-preview-actions]")!;

    expect(header.firstElementChild).toBe(anchor);
    expect(header.lastElementChild).toBe(actions);
    expect(anchor).toContainElement(screen.getByRole("button", { name: "Visual" }));
    expect(anchor).toContainElement(
      screen.getByRole("button", { name: "ATS text" }),
    );
    expect(actions).toContainElement(
      screen.getByRole("button", { name: "Review" }),
    );

    openReviewMenu();
    fireEvent.click(screen.getByRole("switch", { name: "Anonymize" }));
    fireEvent.click(screen.getByRole("switch", { name: "6s Scan" }));

    // The right-hand group now carries two active markers, but the switch
    // keeps its DOM slot. jsdom has no layout, so the class/DOM contract is
    // the guard here and real x-position stays a Playwright concern.
    expect(header.querySelector("[data-preview-mode-anchor]")).toBe(anchor);
    expect(header.firstElementChild).toBe(anchor);
    expect(header.lastElementChild).toBe(actions);
    expect(anchor).toContainElement(screen.getByRole("button", { name: "Visual" }));
    expect(screen.getByRole("button", { name: /Review, active/ })).toBeVisible();
    expect(document.querySelector("[data-review-active-dot]")).toBeVisible();
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

  it("offers an inline Reset beside 1 page once a fit is applied", async () => {
    const doc = createEmptyResume();
    doc.metadata.page.fitScale = 0.85;
    useResumeStore.setState({ doc });

    await renderReadyWorkspace();

    const reset = screen.getByRole("button", { name: "Reset fit" });
    const label = reset.closest<HTMLElement>("[data-preview-page-label]");

    expect(label).toHaveTextContent("1 page");
    expect(label).toHaveClass("text-xs", "text-muted");
    expect(label).not.toHaveClass("border");
    expect(label).not.toHaveClass("bg-surface");
    expect(reset).toHaveTextContent("Reset");
    expect(reset).toHaveAttribute("title", "Reset fit (85% → 100%)");
    expect(reset).toHaveClass(
      "bg-primary/10",
      "text-primary",
      "font-medium",
      "rounded-full",
      "px-2.5",
      "py-0.5",
    );
    expect(label).toContainElement(reset);

    fireEvent.click(reset);

    await waitFor(() => {
      expect(useResumeStore.getState().doc.metadata.page.fitScale).toBe(1);
    });
    expect(
      screen.queryByRole("button", { name: "Reset fit" }),
    ).not.toBeInTheDocument();
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

  it("keeps the preview mode row free of the floating zoom reset", async () => {
    await renderReadyWorkspace();

    const header = screen
      .getByRole("button", { name: "Visual" })
      .closest<HTMLElement>("[data-preview-mode-header]")!;

    // The zoom Reset is owned by the viewport as a floating bottom-right pill
    // (covered by its own tests); the single mode row must never render it and
    // start crowding Review off a 390px phone.
    expect(
      screen.queryByRole("button", { name: "Reset preview zoom" }),
    ).not.toBeInTheDocument();
    expect(header).toContainElement(
      screen.getByRole("button", { name: "Review" }),
    );
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
