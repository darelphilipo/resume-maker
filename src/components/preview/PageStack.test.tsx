import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import { PageStack } from "./PageStack";

describe("PageStack", () => {
  it("renders one resume page per page assignment with a 1-based data-page", () => {
    const doc = createEmptyResume();

    const { container } = render(
      <PageStack
        doc={doc}
        pages={[["__header"], ["summary"], ["experience"]]}
      />,
    );

    const pages = Array.from(container.querySelectorAll(".resume-page"));

    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.getAttribute("data-page"))).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(container.querySelector(".resume-print-root")).not.toBeNull();
  });

  it("adds the recruiter-scan class only when scanHighlight is on", () => {
    const doc = createEmptyResume();

    const { container, rerender } = render(
      <PageStack doc={doc} pages={[["__header"]]} />,
    );
    const root = container.querySelector(".resume-print-root");

    expect(root).not.toHaveClass("resume-scan");
    expect(root).not.toHaveAttribute("data-scan-highlight");

    rerender(<PageStack doc={doc} pages={[["__header"]]} scanHighlight />);

    expect(root).toHaveClass("resume-scan");
    expect(root).toHaveAttribute("data-scan-highlight", "true");
  });
});
