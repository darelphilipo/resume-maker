import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExportJsonButton, slugFileName } from "./ExportJsonButton";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
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
  it("opens a menu with a backup and a JSON Resume choice", async () => {
    const user = userEvent.setup();
    render(<ExportJsonButton />);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(
      screen.getByRole("menu", { name: "Export JSON" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Resume Maker backup/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /JSON Resume/ }),
    ).toBeInTheDocument();
  });

  it("downloads a portable JSON Resume file from the menu", async () => {
    const user = userEvent.setup();
    let downloadName = "";

    render(<ExportJsonButton />);
    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this instanceof HTMLAnchorElement) {
        downloadName = this.download;
      }
    });

    await user.click(screen.getByRole("menuitem", { name: /JSON Resume/ }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloadName).toBe("resume-json-resume.json");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:resume");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("downloads the full backup from the same menu", async () => {
    const user = userEvent.setup();
    let downloadName = "";

    render(<ExportJsonButton />);
    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this instanceof HTMLAnchorElement) {
        downloadName = this.download;
      }
    });

    await user.click(
      screen.getByRole("menuitem", { name: /Resume Maker backup/ }),
    );

    expect(downloadName).toBe("resume-resume.json");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ExportJsonButton />);

    const trigger = screen.getByRole("button", { name: "Export JSON" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
