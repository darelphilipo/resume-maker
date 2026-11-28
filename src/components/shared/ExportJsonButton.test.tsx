import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildArchetype } from "@/lib/presets/archetypes";
import {
  canUndo,
  resetResumeStore,
  undo,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { ExportJsonButton, slugFileName } from "./ExportJsonButton";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  resetResumeStore();
  URL.createObjectURL = vi.fn(
    () => "blob:resume",
  ) as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});

describe("slugFileName", () => {
  it("lowercases and hyphenates a name", () => {
    expect(slugFileName("Ada Lovelace")).toBe("ada-lovelace");
  });

  it("falls back to resume for empty input", () => {
    expect(slugFileName("  ")).toBe("resume");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugFileName("O'Brien / Smith")).toBe("o-brien-smith");
  });
});

describe("ExportJsonButton", () => {
  it("labels the menu trigger with an Export & options tooltip and desktop text", () => {
    render(<ExportJsonButton />);

    const trigger = screen.getByRole("button", { name: "Export & options" });
    const label = trigger.querySelector("span");
    const chevron = trigger.querySelector("[data-export-chevron]");
    const dots = trigger.querySelector("[data-export-dots]");

    expect(trigger).toHaveAttribute("title", "Export & options");
    expect(trigger).toHaveTextContent("Export");
    expect(trigger).not.toHaveTextContent("More");
    expect(label).toHaveClass("hidden", "lg:inline-flex");
    expect(chevron).not.toBeNull();
    // The compact dots stay on phones; desktop shows the labelled Export menu.
    expect(dots).toHaveClass("lg:hidden");
    // Balanced horizontal padding keeps the hover/focus box around the label.
    expect(trigger).toHaveClass("px-2", "lg:px-3", "lg:gap-1.5");
  });

  it("opens a menu with a backup and a JSON Resume choice", async () => {
    const user = userEvent.setup();
    render(<ExportJsonButton />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Export & options" }),
    );

    expect(
      screen.getByRole("menu", { name: "Export & options" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Download backup \(\.json\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Export JSON Resume/ }),
    ).toBeInTheDocument();
  });

  it("downloads a portable JSON Resume file from the menu", async () => {
    const user = userEvent.setup();
    let downloadName = "";

    render(<ExportJsonButton />);
    await user.click(
      screen.getByRole("button", { name: "Export & options" }),
    );

    vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this instanceof HTMLAnchorElement) {
        downloadName = this.download;
      }
    });

    await user.click(
      screen.getByRole("menuitem", { name: /Export JSON Resume/ }),
    );

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloadName).toBe("resume-json-resume.json");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:resume");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("downloads the full backup from the same menu", async () => {
    const user = userEvent.setup();
    let downloadName = "";

    render(<ExportJsonButton />);
    await user.click(
      screen.getByRole("button", { name: "Export & options" }),
    );

    vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this instanceof HTMLAnchorElement) {
        downloadName = this.download;
      }
    });

    await user.click(
      screen.getByRole("menuitem", { name: /Download backup \(\.json\)/ }),
    );

    expect(downloadName).toBe("resume-resume.json");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ExportJsonButton />);

    const trigger = screen.getByRole("button", {
      name: "Export & options",
    });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("does not offer Clear sample data on a resume without a preset", async () => {
    const user = userEvent.setup();
    render(<ExportJsonButton />);

    await user.click(screen.getByRole("button", { name: "Export & options" }));

    expect(
      screen.queryByRole("menuitem", { name: /Clear sample data/ }),
    ).toBeNull();
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("clears every sample entry in one undoable patch", async () => {
    const sample = buildArchetype("software-engineer");

    expect(sample).not.toBeNull();
    useResumeStore.setState({ doc: sample! });

    const user = userEvent.setup();
    render(<ExportJsonButton />);
    await user.click(screen.getByRole("button", { name: "Export & options" }));

    const trigger = screen.getByRole("button", { name: "Export & options" });
    const clear = screen.getByRole("menuitem", { name: /Clear sample data/ });
    const separator = screen.getByRole("separator");

    expect(clear).toHaveAttribute("data-clear-sample-data");
    // The divider groups the sample reset apart from the export actions above.
    expect(separator).toHaveAttribute("data-export-divider");
    expect(
      separator.compareDocumentPosition(clear) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await user.click(clear);

    const cleared = useResumeStore.getState().doc;

    expect(cleared.metadata.sampleData).toBe(false);
    expect(cleared.basics.name).toBe("");
    expect(cleared.summary.content).toBe("");
    expect(cleared.sections.experience.items).toEqual([]);
    expect(cleared.sections.projects.items).toEqual([]);
    expect(cleared.sections.skills.items).toEqual([]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(canUndo()).toBe(true);

    act(() => {
      undo();
    });

    expect(useResumeStore.getState().doc).toEqual(sample);
  });
});
