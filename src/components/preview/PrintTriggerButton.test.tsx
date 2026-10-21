import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import { PrintTriggerButton } from "./PrintTriggerButton";

const PAGES = [["__header"], ["summary", "experience"]];

function portalPages(): number {
  return document.querySelectorAll("#print-portal .resume-page").length;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PrintTriggerButton", () => {
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
