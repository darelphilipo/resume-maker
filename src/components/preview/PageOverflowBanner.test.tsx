import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  analyzeBulletLines,
  summarizeBulletIssues,
} from "@/lib/lint/bulletMetrics";

import { BulletTrimTips, PageOverflowBanner } from "./PageOverflowBanner";

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

describe("PageOverflowBanner", () => {
  it("renders nothing when the document fits on one page", () => {
    const { container } = render(
      <PageOverflowBanner overflowPx={0} pageCount={1} lineHeightPx={14} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("reports the spill and applies the computed fit scale", () => {
    const onFit = vi.fn();

    render(
      <PageOverflowBanner
        overflowPx={42}
        pageCount={2}
        lineHeightPx={14}
        fitScale={0.82}
        onFit={onFit}
      />,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Spills onto 2 pages");
    expect(status).toHaveTextContent("Runs onto page 2 by ~3 lines");

    const button = screen.getByRole("button", { name: "Fit to 1 Page" });

    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onFit).toHaveBeenCalledWith(0.82);
  });

  it("still offers fitting when multiple pages are filled without a single-section overflow", () => {
    render(
      <PageOverflowBanner
        overflowPx={0}
        pageCount={2}
        lineHeightPx={14}
        fitScale={0.9}
        onFit={() => undefined}
      />,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Spills onto 2 pages");
    expect(status).not.toHaveTextContent("Runs onto page");
    expect(screen.getByRole("button", { name: "Fit to 1 Page" })).toBeEnabled();
  });

  it("keeps the action disabled until a fit target and handler exist", () => {
    render(
      <PageOverflowBanner overflowPx={42} pageCount={2} lineHeightPx={14} />,
    );

    expect(screen.getByRole("button", { name: "Fit to 1 Page" })).toBeDisabled();
  });

  it("explains when one page would need an unreadable scale", () => {
    render(
      <PageOverflowBanner
        overflowPx={420}
        pageCount={2}
        lineHeightPx={14}
        fitScale={null}
        fitBlockedReason="too-tall"
        onFit={() => undefined}
      />,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Too tall to fit on one page above 78%");
    expect(
      screen.queryByRole("button", { name: "Fit to 1 Page" }),
    ).not.toBeInTheDocument();
  });

  it("explains a forced page break instead of offering a fit", () => {
    render(
      <PageOverflowBanner
        overflowPx={0}
        pageCount={2}
        lineHeightPx={14}
        fitBlockedReason="page-break"
        onFit={() => undefined}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "A section is set to start on a new page",
    );
    expect(
      screen.queryByRole("button", { name: "Fit to 1 Page" }),
    ).not.toBeInTheDocument();
  });

  it("never divides by a zero line height", () => {
    render(<PageOverflowBanner overflowPx={1} pageCount={1} lineHeightPx={0} />);

    expect(screen.getByRole("status")).toHaveTextContent("by ~1 lines");
  });

  it("is a slim inline strip, not a tall yellow banner box", () => {
    const { container } = render(
      <PageOverflowBanner
        overflowPx={42}
        pageCount={2}
        lineHeightPx={14}
        fitScale={0.82}
        onFit={() => undefined}
      />,
    );

    const strip = container.querySelector("[data-page-overflow]");

    expect(strip).not.toBeNull();
    expect(strip).toHaveClass("flex-nowrap", "text-xs");
    expect(strip).not.toHaveClass(
      "page-overflow-warning",
      "bg-amber-50",
      "flex-wrap",
      "px-3",
      "py-2",
    );
  });

  it("keeps the trim summary in the Trim tips panel, not the spill banner", () => {
    render(
      <PageOverflowBanner overflowPx={0} pageCount={2} lineHeightPx={14} />,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Spills onto 2 pages");
    expect(status).not.toHaveTextContent("trimming them can reclaim");
  });
});

describe("BulletTrimTips", () => {
  it("renders nothing when there is nothing to trim", () => {
    const { container } = render(
      <BulletTrimTips report={summarizeBulletIssues([])} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("lists each issue with a plain-language reason", () => {
    render(<BulletTrimTips report={ORPHAN_REPORT} defaultOpen />);

    expect(screen.getByText("Trim tips (3)")).toBeVisible();
    expect(screen.getByText("3-word line")).toBeVisible();
    expect(screen.getByText("1-word line")).toBeVisible();
    expect(screen.getByText("1 line")).toBeVisible();
    expect(
      screen.getByText(/Led the billing migration for the platform/),
    ).toBeVisible();
    expect(
      screen.getByText(/trimming them can reclaim 3 lines/),
    ).toBeVisible();
  });

  it("caps the visible list and reports the remainder", () => {
    const issues = Array.from({ length: 7 }, (_, index) =>
      analyzeBulletLines([
        `Shipped the onboarding flow for customer segment ${index}`,
        "weekly",
      ])!,
    );
    const report = summarizeBulletIssues(issues);

    render(<BulletTrimTips report={report} defaultOpen />);

    expect(screen.getByText("Trim tips (7)")).toBeVisible();
    expect(screen.getByText("+2 more")).toBeVisible();
    expect(screen.getAllByText("1-word line")).toHaveLength(5);
  });

  it("opens as a dismissible overlay with an explicit close", () => {
    render(<BulletTrimTips report={ORPHAN_REPORT} />);

    expect(
      screen.queryByRole("dialog", { name: "Trim tips" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Trim tips (3)" }));

    const dialog = screen.getByRole("dialog", { name: "Trim tips" });

    expect(dialog).toBeVisible();
    expect(dialog.className).toContain("max-h-[70vh]");
    expect(dialog).toHaveTextContent("trimming them can reclaim 3 lines");

    fireEvent.click(screen.getByRole("button", { name: "Close trim tips" }));

    expect(
      screen.queryByRole("dialog", { name: "Trim tips" }),
    ).not.toBeInTheDocument();
  });

  it("closes the trim overlay on Escape", () => {
    render(<BulletTrimTips report={ORPHAN_REPORT} defaultOpen />);

    expect(screen.getByRole("dialog", { name: "Trim tips" })).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "Trim tips" }),
    ).not.toBeInTheDocument();
  });
});
