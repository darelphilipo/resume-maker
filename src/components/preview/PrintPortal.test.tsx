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

  it("injects an A4 @page rule inside the portal for the default paper size", () => {
    const view = render(
      <PrintPortal doc={createEmptyResume()} pages={[["__header"]]} />,
    );
    const portal = document.getElementById("print-portal");
    const style = portal?.querySelector("style[data-print-page-size]");

    expect(style).not.toBeNull();
    expect(style?.textContent).toBe("@page { size: A4 portrait; margin: 0mm; }");

    view.unmount();

    expect(document.querySelector("style[data-print-page-size]")).toBeNull();
  });

  it("switches the injected @page rule to Letter when that size is selected", () => {
    const doc = createEmptyResume();
    doc.metadata.page.format = "letter";

    const view = render(<PrintPortal doc={doc} pages={[["__header"]]} />);
    const portal = document.getElementById("print-portal");
    const style = portal?.querySelector("style[data-print-page-size]");

    expect(style?.textContent).toBe(
      "@page { size: letter portrait; margin: 0mm; }",
    );
    expect(portal?.getAttribute("style")).toContain("--page-width: 215.9mm");

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

  it("never applies the 6-second recruiter scan to the printed resume", () => {
    const doc = createEmptyResume();
    doc.summary.content = "<p>Shipped 3x faster and saved $1.2M in 2024.</p>";

    const view = render(<PrintPortal doc={doc} pages={[["summary"]]} />);
    const portal = document.getElementById("print-portal");

    expect(portal?.querySelector(".resume-scan")).toBeNull();
    expect(portal?.querySelector(".scan-metric")).toBeNull();
    expect(portal?.textContent).toContain("Shipped 3x faster and saved $1.2M");

    view.unmount();
  });
});
