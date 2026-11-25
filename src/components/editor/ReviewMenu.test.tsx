import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { analyzeBulletLines, summarizeBulletIssues } from "@/lib/lint/bulletMetrics";
import type { BulletLintReport } from "@/lib/lint/bulletMetrics";
import type { FitBlockedReason } from "@/lib/pagination/usePageLayout";

import { ReviewMenu } from "./ReviewMenu";

const TRIM_REPORT: BulletLintReport = summarizeBulletIssues([
  analyzeBulletLines([
    "Led the billing migration for the platform and",
    "saved 3 hours",
  ])!,
  analyzeBulletLines([
    "Shipped the onboarding flow for every new customer",
    "weekly",
  ])!,
]);

function renderMenu(
  overrides: {
    scan?: boolean;
    anonymize?: boolean;
    onToggleScan?: () => void;
    onToggleAnonymize?: () => void;
    bulletReport?: BulletLintReport | null;
    fitTarget?: number | null;
    fitBlockedReason?: FitBlockedReason | null;
    appliedFitScale?: number;
    onFit?: (scale: number) => void;
    onResetFit?: () => void;
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
      bulletReport={overrides.bulletReport ?? null}
      fitTarget={overrides.fitTarget ?? null}
      fitBlockedReason={overrides.fitBlockedReason ?? null}
      appliedFitScale={overrides.appliedFitScale ?? 1}
      onFit={overrides.onFit}
      onResetFit={overrides.onResetFit}
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

  it("reflects active tools as checked switches without repeating the review-mode notice", () => {
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
    // The Preview pane's banner is the only "Review mode is on" notice; the
    // dialog stays clean instead of stacking a second copy behind the modal.
    expect(screen.queryByText(/Review mode is on/)).not.toBeInTheDocument();
  });

  it("badges the pill and opens Trim tips from the dialog", () => {
    renderMenu({ bulletReport: TRIM_REPORT });

    const trigger = screen.getByRole("button", { name: /Review/ });

    expect(document.querySelector("[data-review-trim-badge]")).toHaveTextContent(
      "2",
    );
    expect(trigger).toHaveAccessibleName(/2 trim tips/);

    openMenu();
    fireEvent.click(
      screen.getByRole("button", { name: /^Trim tips \(2\)/ }),
    );

    // Review closes and the dedicated trim dialog takes over.
    expect(
      screen.queryByRole("dialog", { name: "Review tools" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Trim tips" })).toHaveTextContent(
      /Led the billing migration/,
    );
  });

  it("fits the resume to one page from the Review dialog", () => {
    const onFit = vi.fn();

    renderMenu({ fitTarget: 0.82, onFit });
    openMenu();
    fireEvent.click(
      screen.getByRole("button", { name: /^Fit to 1 Page/ }),
    );

    expect(onFit).toHaveBeenCalledWith(0.82);
    expect(
      screen.queryByRole("dialog", { name: "Review tools" }),
    ).not.toBeInTheDocument();
  });

  it("resets a reduced fit and marks the pill while it is active", () => {
    const onResetFit = vi.fn();

    renderMenu({ appliedFitScale: 0.85, onResetFit });

    expect(document.querySelector("[data-review-fit-dot]")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Review, fit is reduced/ }),
    ).toBeVisible();

    openMenu();
    fireEvent.click(screen.getByRole("button", { name: /^Reset fit/ }));

    expect(onResetFit).toHaveBeenCalledTimes(1);
  });

  it("moves a blocked fit's plain-English reason under the disabled control", () => {
    renderMenu({
      fitTarget: null,
      fitBlockedReason: "too-tall",
      onFit: vi.fn(),
    });
    openMenu();

    const blocked = document.querySelector("[data-review-fit-blocked]");

    expect(blocked).toHaveTextContent("Fit to 1 Page");
    expect(blocked).toHaveTextContent("Too long to shrink to 1 page cleanly");
    expect(blocked).toHaveTextContent("trim a few lines");
    expect(blocked).toHaveTextContent("Compact density");
    expect(blocked).not.toHaveTextContent("Min 78%");
    expect(blocked).toBeDisabled();
  });

  it("explains a forced page break under the same disabled control", () => {
    renderMenu({
      fitTarget: null,
      fitBlockedReason: "page-break",
      onFit: vi.fn(),
    });
    openMenu();

    const blocked = document.querySelector("[data-review-fit-blocked]");

    expect(blocked).toHaveTextContent("start on a new page");
    expect(blocked).toBeDisabled();
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
