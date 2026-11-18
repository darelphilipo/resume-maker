import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageOverflowBanner } from "./PageOverflowBanner";

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
});
