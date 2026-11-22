import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CenteredModal } from "./CenteredModal";

function renderModal(onClose = vi.fn()) {
  render(
    <CenteredModal open onClose={onClose} titleId="modal-title">
      <h2 id="modal-title">A title</h2>
      <p>Modal body</p>
    </CenteredModal>,
  );
  return { onClose };
}

describe("CenteredModal", () => {
  it("renders nothing while closed", () => {
    render(
      <CenteredModal open={false} onClose={vi.fn()} titleId="modal-title">
        <h2 id="modal-title">A title</h2>
      </CenteredModal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("portals a centred, labelled dialog to the body", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "A title" });
    const overlay = dialog.parentElement;

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(overlay).toHaveAttribute("data-centered-modal");
    expect(overlay?.parentElement).toBe(document.body);
    expect(overlay?.className).toContain("fixed");
    expect(overlay?.className).toContain("items-center");
    expect(overlay?.className).toContain("justify-center");
    expect(dialog.className).toContain("max-w-md");
    expect(screen.getByText("Modal body")).toBeInTheDocument();
  });

  it("closes on a backdrop tap but not on a tap inside the dialog", () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole("dialog", { name: "A title" });

    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
