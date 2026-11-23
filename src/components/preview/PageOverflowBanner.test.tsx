import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MIN_FIT_LABEL, fitBlockedCopy } from "@/lib/pagination/fitCopy";

import { PageOverflowBanner } from "./PageOverflowBanner";

describe("PageOverflowBanner", () => {
  it("renders nothing when the document fits on one page", () => {
    const { container } = render(
      <PageOverflowBanner overflowPx={0} pageCount={1} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows one compact pill and applies the computed fit scale", () => {
    const onFit = vi.fn();

    render(
      <PageOverflowBanner
        overflowPx={42}
        pageCount={2}
        fitScale={0.82}
        onFit={onFit}
      />,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Spills onto 2 pages");
    // The line estimate and the old truncating copy are gone: the pill owns
    // the count and a short action label only.
    expect(status).toHaveTextContent(/2 pages\s*·\s*Fit/);

    const button = screen.getByRole("button", { name: "Fit to 1 Page" });

    expect(button).toHaveTextContent("Fit");
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onFit).toHaveBeenCalledWith(0.82);
  });

  it("still offers fitting when multiple pages are filled without a single-section overflow", () => {
    render(
      <PageOverflowBanner
        overflowPx={0}
        pageCount={2}
        fitScale={0.9}
        onFit={() => undefined}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/2 pages\s*·\s*Fit/);
    expect(screen.getByRole("button", { name: "Fit to 1 Page" })).toBeEnabled();
  });

  it("keeps the action unavailable until a fit target and handler exist", () => {
    render(<PageOverflowBanner overflowPx={42} pageCount={2} />);

    expect(
      screen.queryByRole("button", { name: "Fit to 1 Page" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 pages");
  });

  it("shows the readable floor, not a truncated sentence", () => {
    render(
      <PageOverflowBanner
        overflowPx={420}
        pageCount={2}
        fitScale={null}
        fitBlockedReason="too-tall"
        onFit={() => undefined}
      />,
    );

    const status = screen.getByRole("status");
    const floor = screen.getByTitle(fitBlockedCopy("too-tall"));

    expect(status).toHaveTextContent(
      new RegExp(`2 pages\\s*·\\s*${MIN_FIT_LABEL}`),
    );
    expect(status).toHaveTextContent(fitBlockedCopy("too-tall"));
    expect(floor).toHaveTextContent(MIN_FIT_LABEL);
    expect(floor).not.toHaveClass("truncate");
    expect(
      screen.queryByRole("button", { name: "Fit to 1 Page" }),
    ).not.toBeInTheDocument();
  });

  it("explains a forced page break instead of offering a fit", () => {
    render(
      <PageOverflowBanner
        overflowPx={0}
        pageCount={2}
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

  it("is one inline pill, not a full-width banner row", () => {
    const { container } = render(
      <PageOverflowBanner
        overflowPx={42}
        pageCount={2}
        fitScale={0.82}
        onFit={() => undefined}
      />,
    );

    const pill = container.querySelector("[data-page-overflow]");

    expect(pill).not.toBeNull();
    expect(pill).toHaveClass(
      "h-8",
      "rounded-full",
      "border-line",
      "whitespace-nowrap",
      "text-xs",
    );
    expect(pill).not.toHaveClass(
      "page-overflow-warning",
      "bg-amber-50",
      "flex-wrap",
      "px-3",
      "py-2",
    );
  });

  it("keeps the trim summary in the Trim tips panel, not the spill pill", () => {
    render(<PageOverflowBanner overflowPx={0} pageCount={2} />);

    expect(screen.getByRole("status")).not.toHaveTextContent(
      "trimming them can reclaim",
    );
  });
});
