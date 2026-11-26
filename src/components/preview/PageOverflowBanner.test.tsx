import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageOverflowBanner } from "./PageOverflowBanner";

describe("PageOverflowBanner", () => {
  it("renders nothing when the document fits on one page", () => {
    const { container } = render(
      <PageOverflowBanner overflowPx={0} pageCount={1} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the count as muted status and a tinted Fit action", () => {
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
    expect(status).toHaveClass("text-xs", "text-muted");
    expect(status).not.toHaveClass("rounded-full", "border", "bg-surface");

    const button = screen.getByRole("button", { name: "Fit to 1 page" });

    expect(button).toHaveTextContent("Fit 1p");
    expect(button).toHaveClass(
      "bg-primary/10",
      "text-primary",
      "font-medium",
      "rounded-full",
      "px-2.5",
      "py-0.5",
    );
    expect(button).toBeEnabled();
    expect(button.querySelector("svg")).not.toBeNull();
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

    expect(screen.getByRole("status")).toHaveTextContent("2 pages");
    expect(screen.getByRole("button", { name: "Fit to 1 page" })).toBeEnabled();
  });

  it("keeps the action unavailable until a fit target and handler exist", () => {
    render(<PageOverflowBanner overflowPx={42} pageCount={2} />);

    expect(
      screen.queryByRole("button", { name: "Fit to 1 page" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 pages");
  });

  it("shows only the page count when no readable fit exists", () => {
    render(
      <PageOverflowBanner
        overflowPx={420}
        pageCount={2}
        fitScale={null}
        onFit={() => undefined}
      />,
    );

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("2 pages");
    // No percentage floor, no truncated sentence, and no disabled duplicate of
    // the Fit action: the explanation lives in Review instead.
    expect(status).not.toHaveTextContent("Min");
    expect(status).not.toHaveTextContent("%");
    expect(status).not.toHaveTextContent("trim");
    expect(
      screen.queryByRole("button", { name: "Fit to 1 page" }),
    ).not.toBeInTheDocument();
  });

  it("separates borderless status text from one compact action pill", () => {
    const { container } = render(
      <PageOverflowBanner
        overflowPx={42}
        pageCount={2}
        fitScale={0.82}
        onFit={() => undefined}
      />,
    );

    const wrapper = container.querySelector("[data-page-overflow]");
    const status = container.querySelector("[data-page-overflow-count]");

    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass("flex", "items-center", "whitespace-nowrap");
    expect(wrapper).not.toHaveClass("border");
    expect(wrapper).not.toHaveClass("border-line");
    expect(wrapper).not.toHaveClass("bg-surface");
    expect(wrapper).not.toHaveClass("rounded-full");
    expect(status).toHaveClass("text-xs", "text-muted");
    expect(status).not.toHaveClass("font-semibold");
  });

  it("keeps the trim summary in the Trim tips panel, not the spill pill", () => {
    render(<PageOverflowBanner overflowPx={0} pageCount={2} />);

    expect(screen.getByRole("status")).not.toHaveTextContent(
      "trimming them can reclaim",
    );
  });
});
