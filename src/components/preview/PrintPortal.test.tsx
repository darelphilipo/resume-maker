import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";

import { PrintPortal } from "./PrintPortal";

describe("PrintPortal", () => {
  it("renders one page per assignment as a direct child of body", () => {
    const doc = createEmptyResume();
    const pages = [["__header"], ["summary"], ["experience"]];

    const view = render(<PrintPortal doc={doc} pages={pages} />);
    const portal = document.getElementById("print-portal");

    expect(portal).not.toBeNull();
    expect(portal?.parentElement).toBe(document.body);
    expect(portal?.querySelectorAll(".resume-page")).toHaveLength(
      pages.length,
    );

    view.unmount();
  });

  it("omits empty trailing bullet items from the printed pages", () => {
    const doc = createEmptyResume();
    doc.summary.content = "<ul><li>Safe</li><li><p></p></li></ul>";

    const view = render(<PrintPortal doc={doc} pages={[["summary"]]} />);
    const portal = document.getElementById("print-portal");
    const items = portal?.querySelectorAll(".resume-rich-text li");

    expect(items).toHaveLength(1);
    expect(items?.[0]?.textContent).toBe("Safe");

    view.unmount();
  });

  it("sanitizes rich text before rendering the portal", () => {
    const doc = createEmptyResume();
    doc.summary.content =
      '<p>Safe <strong>text</strong></p><script>window.__pwned = true</script>';

    const view = render(<PrintPortal doc={doc} pages={[["summary"]]} />);
    const portal = document.getElementById("print-portal");

    expect(portal?.querySelector("script")).toBeNull();
    expect(portal?.innerHTML).not.toContain("<script");
    expect(portal?.textContent).toContain("Safe text");

    view.unmount();
  });
});
