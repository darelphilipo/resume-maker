import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReviewMenu } from "./ReviewMenu";

function renderMenu(
  overrides: {
    scan?: boolean;
    anonymize?: boolean;
    onToggleScan?: () => void;
    onToggleAnonymize?: () => void;
  } = {},
) {
  const onToggleScan = overrides.onToggleScan ?? vi.fn();
  const onToggleAnonymize = overrides.onToggleAnonymize ?? vi.fn();

  render(
    <ReviewMenu
      scan={overrides.scan ?? false}
      anonymize={overrides.anonymize ?? false}
      onToggleScan={onToggleScan}
      onToggleAnonymize={onToggleAnonymize}
    />,
  );

  return { onToggleScan, onToggleAnonymize };
}

function openMenu(): void {
  fireEvent.click(screen.getByRole("button", { name: /Review/ }));
}

describe("ReviewMenu", () => {
  it("keeps both review tools behind one compact pill", () => {
    renderMenu();

    const trigger = screen.getByRole("button", { name: "Review" });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveClass("h-8", "text-xs", "px-2.5");
    expect(trigger).not.toHaveAttribute("data-review-active-dot");
    expect(
      screen.queryByRole("switch", { name: "6s Scan" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "Anonymize" }),
    ).not.toBeInTheDocument();
  });

  it("shows an active dot when either review tool is on", () => {
    const { rerender } = render(
      <ReviewMenu
        scan={false}
        anonymize={false}
        onToggleScan={vi.fn()}
        onToggleAnonymize={vi.fn()}
      />,
    );

    expect(
      document.querySelector("[data-review-active-dot]"),
    ).not.toBeInTheDocument();

    rerender(
      <ReviewMenu
        scan={true}
        anonymize={false}
        onToggleScan={vi.fn()}
        onToggleAnonymize={vi.fn()}
      />,
    );

    expect(document.querySelector("[data-review-active-dot]")).toBeVisible();
    expect(screen.getByRole("button", { name: /Review, active/ })).toBeVisible();
  });

  it("opens a labelled dialog with both switches and toggles each one", () => {
    const { onToggleScan, onToggleAnonymize } = renderMenu({ scan: false });

    openMenu();

    const dialog = screen.getByRole("dialog", { name: "Review tools" });

    expect(dialog).toBeVisible();
    expect(screen.getByRole("button", { name: /Review/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    const scan = screen.getByRole("switch", { name: "6s Scan" });
    const anonymize = screen.getByRole("switch", { name: "Anonymize" });

    expect(scan).toHaveAttribute("aria-checked", "false");
    expect(anonymize).toHaveAttribute("aria-checked", "false");

    fireEvent.click(scan);
    fireEvent.click(anonymize);

    expect(onToggleScan).toHaveBeenCalledTimes(1);
    expect(onToggleAnonymize).toHaveBeenCalledTimes(1);
  });

  it("reflects an active tool as a checked switch and explains review mode", () => {
    renderMenu({ scan: true, anonymize: true });

    openMenu();

    expect(screen.getByRole("switch", { name: "6s Scan" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: "Anonymize" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(document.querySelector("[data-review-mode-note]")).toHaveTextContent(
      "your saved resume is unchanged",
    );
  });

  it("closes on the X, the backdrop, and Escape", () => {
    renderMenu();
    openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Close review tools" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openMenu();
    const dialog = screen.getByRole("dialog", { name: "Review tools" });

    fireEvent.click(dialog);
    expect(screen.getByRole("dialog")).toBeVisible();

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
