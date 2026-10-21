import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageOverflowBanner } from "./PageOverflowBanner";

describe("PageOverflowBanner", () => {
  it("renders nothing when the document fits", () => {
    const { container } = render(
      <PageOverflowBanner overflowPx={0} pageCount={2} lineHeightPx={14} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("reports overflow in whole lines and offers a disabled fit action", () => {
    render(<PageOverflowBanner overflowPx={42} pageCount={2} lineHeightPx={14} />);

    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Runs onto page 2 by ~3 lines");
    expect(screen.getByRole("button", { name: "Fit to 1 Page" })).toBeDisabled();
    expect(status).toHaveTextContent(/coming soon/i);
  });

  it("never divides by a zero line height", () => {
    render(<PageOverflowBanner overflowPx={1} pageCount={1} lineHeightPx={0} />);

    expect(screen.getByRole("status")).toHaveTextContent("by ~1 lines");
  });
});
