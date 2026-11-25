import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { analyzeBulletLines, summarizeBulletIssues } from "@/lib/lint/bulletMetrics";

import { TrimTipsDialog } from "./TrimTipsDialog";

const ORPHAN_REPORT = summarizeBulletIssues([
  analyzeBulletLines([
    "Led the billing migration for the platform and",
    "saved 3 hours",
  ])!,
  analyzeBulletLines([
    "Shipped the onboarding flow for every new customer",
    "weekly",
  ])!,
  analyzeBulletLines(["Built ".repeat(60)])!,
]);

describe("TrimTipsDialog", () => {
  it("lists each issue with a plain-language reason", () => {
    render(
      <TrimTipsDialog
        report={ORPHAN_REPORT}
        titleId="trim-title"
        hiddenCount={0}
        onClose={() => undefined}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Trim tips" });

    expect(dialog).toBeVisible();
    expect(screen.getByText("3-word line")).toBeVisible();
    expect(screen.getByText("1-word line")).toBeVisible();
    expect(screen.getByText("1 line")).toBeVisible();
    expect(
      screen.getByText(/Led the billing migration for the platform/),
    ).toBeVisible();
    expect(screen.getByText(/trimming them can reclaim 3 lines/)).toBeVisible();
  });

  it("caps the visible list and reports the remainder", () => {
    const issues = Array.from({ length: 7 }, (_, index) =>
      analyzeBulletLines([
        `Shipped the onboarding flow for customer segment ${index}`,
        "weekly",
      ])!,
    );
    const report = summarizeBulletIssues(issues);

    render(
      <TrimTipsDialog
        report={report}
        titleId="trim-title"
        hiddenCount={2}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("+2 more")).toBeVisible();
    expect(screen.getAllByText("1-word line")).toHaveLength(5);
  });

  it("closes from the X and Escape", () => {
    const onClose = vi.fn();

    render(
      <TrimTipsDialog
        report={ORPHAN_REPORT}
        titleId="trim-title"
        hiddenCount={0}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close trim tips" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("makes each tip a button that reports its issue", () => {
    const onSelectIssue = vi.fn();

    render(
      <TrimTipsDialog
        report={ORPHAN_REPORT}
        titleId="trim-title"
        hiddenCount={0}
        onClose={() => undefined}
        onSelectIssue={onSelectIssue}
      />,
    );

    const tip = screen.getByRole("button", {
      name: /Led the billing migration for the platform/,
    });

    expect(tip).toHaveAttribute("title", "Open this bullet in the editor");
    expect(screen.getByText(/Tap a tip to open that bullet/)).toBeVisible();

    fireEvent.click(tip);

    expect(onSelectIssue).toHaveBeenCalledWith(
      expect.objectContaining({ snippet: expect.stringContaining("Led the billing") }),
    );
  });

  it("keeps the list read-only when no jump handler is provided", () => {
    render(
      <TrimTipsDialog
        report={ORPHAN_REPORT}
        titleId="trim-title"
        hiddenCount={0}
        onClose={() => undefined}
      />,
    );

    expect(
      screen.queryByText(/Tap a tip to open that bullet/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Led the billing migration/ }),
    ).not.toBeInTheDocument();
  });
});
