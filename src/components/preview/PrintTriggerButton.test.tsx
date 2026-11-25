import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import { PRINT_JOB_RELEASE_MS, PrintTriggerButton } from "./PrintTriggerButton";

const PAGES = [["__header"], ["summary", "experience"]];

function portalPages(): number {
  return document.querySelectorAll("#print-portal .resume-page").length;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrintTriggerButton", () => {
  it("describes Save PDF with an absolute print-headers tooltip", () => {
    render(<PrintTriggerButton doc={createEmptyResume()} pages={PAGES} />);

    const button = screen.getByRole("button", { name: "Save PDF" });
    const tip = screen.getByRole("tooltip");

    expect(tip).toHaveTextContent("Set Paper size to A4");
    expect(tip).toHaveTextContent(
      "turn off “Headers and footers” in the print dialog",
    );
    expect(tip).toHaveClass("absolute", "invisible", "opacity-0");
    expect(tip).toHaveClass("pointer-fine:group-hover:visible");
    expect(button).toHaveAttribute("aria-describedby", tip.id);
    // Save PDF is the one solid primary action in the editor header.
    expect(button).toHaveClass(
      "bg-primary",
      "border-primary",
      "text-white",
      "min-w-10",
      "shrink-0",
    );
  });

  it("matches the print tip paper size to the selected format", () => {
    const doc = createEmptyResume();
    doc.metadata.page.format = "letter";

    render(<PrintTriggerButton doc={doc} pages={PAGES} />);

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Set Paper size to Letter",
    );
  });

  it("toggles the tip from the touch info button", () => {
    render(<PrintTriggerButton doc={createEmptyResume()} pages={PAGES} />);

    const tip = screen.getByRole("tooltip");
    const info = screen.getByRole("button", { name: "Print tips" });

    expect(info).toHaveClass("hidden", "pointer-coarse:inline-flex");
    expect(info).toHaveAttribute("aria-expanded", "false");
    expect(tip).toHaveClass("invisible");

    fireEvent.click(info);

    expect(info).toHaveAttribute("aria-expanded", "true");
    expect(tip).toHaveClass("visible", "opacity-100");

    fireEvent.click(info);

    expect(info).toHaveAttribute("aria-expanded", "false");
    expect(tip).toHaveClass("invisible");
  });

  it("dismisses an open tip on Escape or an outside tap", () => {
    render(<PrintTriggerButton doc={createEmptyResume()} pages={PAGES} />);

    const info = screen.getByRole("button", { name: "Print tips" });

    fireEvent.click(info);
    expect(info).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(info, { key: "Escape" });
    expect(info).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(info);
    expect(info).toHaveAttribute("aria-expanded", "true");

    fireEvent.pointerDown(document.body);
    expect(info).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the captured page snapshot when the live pages collapse", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const doc = createEmptyResume();
    const view = render(<PrintTriggerButton doc={doc} pages={PAGES} />);

    fireEvent.click(screen.getByRole("button", { name: "Save PDF" }));

    await waitFor(() => {
      expect(document.getElementById("print-portal")).not.toBeNull();
    });
    expect(portalPages()).toBe(2);

    view.rerender(
      <PrintTriggerButton doc={doc} pages={[["__header"]]} />,
    );

    expect(portalPages()).toBe(2);

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    await waitFor(() => {
      expect(document.getElementById("print-portal")).toBeNull();
    });
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("re-enables Save PDF when the print dialog never fires afterprint", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});

    try {
      render(<PrintTriggerButton doc={createEmptyResume()} pages={PAGES} />);
      const button = screen.getByRole("button", { name: "Save PDF" });

      fireEvent.click(button);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(print).toHaveBeenCalledTimes(1);
      expect(button).toBeDisabled();

      // printResume's safety timer is a minute long; the trigger's short
      // fallback must release the button well before that.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(PRINT_JOB_RELEASE_MS);
      });

      expect(button).toBeEnabled();
      expect(document.getElementById("print-portal")).toBeNull();

      act(() => {
        window.dispatchEvent(new Event("afterprint"));
      });
      await vi.advanceTimersByTimeAsync(0);
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("ignores clicks while a print job is pending", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const doc = createEmptyResume();

    render(<PrintTriggerButton doc={doc} pages={PAGES} />);

    const button = screen.getByRole("button", { name: "Save PDF" });

    fireEvent.click(button);

    await waitFor(() => {
      expect(document.getElementById("print-portal")).not.toBeNull();
    });

    expect(button).toBeDisabled();
    fireEvent.click(button);

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1), {
      timeout: 3000,
    });

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });

    await waitFor(() => {
      expect(document.getElementById("print-portal")).toBeNull();
    });
    expect(print).toHaveBeenCalledTimes(1);
  });
});
