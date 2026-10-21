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
});
